import React from 'react';
import C3 from "../../assets/C3.png"
import C1 from "../../assets/C1.png"
import C2 from "../../assets/C2.png"
import C4 from "../../assets/C4.svg"
import C5 from "../../assets/C5.png"
import C6 from "../../assets/C6.png"
import C7 from "../../assets/C7.svg"

export default function Certification() {
  const certifications = [
    { id: 1, name: "Medical Commission", image: C1, type: "international" },
    { id: 2, name: "Government Approved", image: C2, type: "government" },
    { id: 3, name: "NABH Accredited", image: C3, alt: "NABH Accreditation", type: "healthcare" },
    { id: 4, name: "Medical Council", image: C4, type: "government" },
    { id: 5, name: "Quality Healthcare", image: C5, alt: "Quality Healthcare", type: "healthcare" },
    { id: 6, name: "Paramedical Council", image: C6, alt: "Patient Safety", type: "healthcare" },
    { id: 7, name: "Ministry of Health", image: C7, alt: "Ministry of Health", type: "government" }
  ];

  const duplicatedCertifications = [...certifications, ...certifications, ...certifications];

  return (
    <section className="py-12 bg-slate-50 overflow-hidden border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 mb-8 text-center">
        <h2 className="text-xl font-bold text-slate-800 tracking-wide uppercase">Accredited & Certified by</h2>
        <p className="text-sm text-slate-500 mt-1">Our hospital meets local and international healthcare standards</p>
      </div>

      <div className="relative w-full flex overflow-x-hidden">
        <div className="animate-marquee flex whitespace-nowrap gap-12 items-center py-4">
          {duplicatedCertifications.map((c, index) => (
            <div key={index} className="inline-flex flex-col items-center justify-center min-w-[120px] h-20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <img src={c.image} alt={c.name} className="h-12 object-contain" />
              <span className="text-[10px] text-slate-500 font-semibold mt-2 whitespace-nowrap">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}