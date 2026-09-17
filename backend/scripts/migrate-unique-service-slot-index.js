/**
 * migrate-unique-service-slot-index.js
 *
 * Safe one-time migration script to:
 *   1. Find existing DUPLICATE active service appointments (same serviceId + date + hour + minute + ampm).
 *   2. Keep the OLDEST appointment per duplicate group (first created wins).
 *   3. Mark extras as "Canceled" (does NOT delete data — reversible if needed).
 *   4. Create the partial unique compound index on (serviceId, date, hour, minute, ampm)
 *      scoped only to active statuses: Pending, Confirmed, Rescheduled.
 *
 * Run ONCE before deploying the slot-uniqueness feature:
 *   node scripts/migrate-unique-service-slot-index.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const ServiceAppointment = require("../models/ServiceAppointment");

const ACTIVE_STATUSES = ["Pending", "Confirmed", "Rescheduled"];
const MIGRATION_NOTE =
  "Canceled by migration: duplicate active service slot detected. Original appointment retained.";

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error(
      "❌  No MONGODB_URI / MONGO_URI found in environment. Aborting."
    );
    process.exit(1);
  }

  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅  Connected.\n");

  // ── Step 1: Find duplicate groups ─────────────────────────────────────────
  console.log("🔍  Scanning for duplicate active service appointment slots...");

  const duplicates = await ServiceAppointment.aggregate([
    {
      $match: { status: { $in: ACTIVE_STATUSES } },
    },
    {
      $group: {
        _id: {
          serviceId: "$serviceId",
          date: "$date",
          hour: "$hour",
          minute: "$minute",
          ampm: "$ampm",
        },
        ids: { $push: "$_id" },
        createdAts: { $push: "$createdAt" },
        count: { $sum: 1 },
      },
    },
    {
      $match: { count: { $gt: 1 } },
    },
  ]);

  if (duplicates.length === 0) {
    console.log("✅  No duplicate active slots found. Clean state.\n");
  } else {
    console.log(
      `⚠️   Found ${duplicates.length} duplicate slot group(s). Processing...\n`
    );

    let totalCanceled = 0;

    for (const group of duplicates) {
      const { serviceId, date, hour, minute, ampm } = group._id;

      // Fetch full documents sorted by createdAt ASC (oldest first)
      const docs = await ServiceAppointment.find({
        serviceId,
        date,
        hour,
        minute,
        ampm,
        status: { $in: ACTIVE_STATUSES },
      }).sort({ createdAt: 1 });

      // Keep the first (oldest), cancel the rest
      const [keeper, ...extras] = docs;

      console.log(
        `  🩺  Service ${serviceId} | Date ${date} | Time ${hour}:${minute} ${ampm}` +
          `\n      Keeping: ${keeper._id} (${keeper.patientName}, created ${keeper.createdAt.toISOString()})` +
          `\n      Canceling ${extras.length} duplicate(s):`
      );

      for (const extra of extras) {
        console.log(
          `        ✗ ${extra._id} (${extra.patientName}, created ${extra.createdAt.toISOString()})`
        );

        await ServiceAppointment.findByIdAndUpdate(extra._id, {
          $set: {
            status: "Canceled",
            notes: extra.notes
              ? `${extra.notes} | ${MIGRATION_NOTE}`
              : MIGRATION_NOTE,
          },
        });

        totalCanceled++;
      }
      console.log("");
    }

    console.log(
      `✅  Resolved duplicates: ${totalCanceled} service appointment(s) marked as Canceled.\n`
    );
  }

  // ── Step 2: Drop any pre-existing partial index to recreate cleanly ────────
  try {
    const existingIndexes = await ServiceAppointment.collection.indexes();
    const alreadyExists = existingIndexes.some(
      (idx) => idx.name === "unique_active_service_slot"
    );

    if (alreadyExists) {
      console.log('🗑️   Dropping existing "unique_active_service_slot" index...');
      await ServiceAppointment.collection.dropIndex("unique_active_service_slot");
      console.log("✅  Dropped.\n");
    }
  } catch (e) {
    // Index may not exist yet — safe to continue
  }

  // ── Step 3: Create the partial unique compound index ──────────────────────
  console.log(
    '🔧  Creating partial unique index "unique_active_service_slot" on (serviceId, date, hour, minute, ampm)...'
  );
  console.log(
    "    Scope: status in [Pending, Confirmed, Rescheduled] only.\n"
  );

  await ServiceAppointment.collection.createIndex(
    { serviceId: 1, date: 1, hour: 1, minute: 1, ampm: 1 },
    {
      unique: true,
      partialFilterExpression: {
        status: { $in: ACTIVE_STATUSES },
      },
      name: "unique_active_service_slot",
      background: true,
    }
  );

  console.log('✅  Index "unique_active_service_slot" created successfully.\n');

  // ── Step 4: Verify the index exists ───────────────────────────────────────
  const indexes = await ServiceAppointment.collection.indexes();
  const ourIndex = indexes.find((i) => i.name === "unique_active_service_slot");
  if (ourIndex) {
    console.log("📋  Index definition confirmed:");
    console.log(JSON.stringify(ourIndex, null, 2));
  }

  console.log("\n🎉  Migration complete. Safe to deploy service slot-uniqueness fix.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
