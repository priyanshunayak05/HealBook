print("STARTING TEST")

import cloudinary
import cloudinary.uploader


cloudinary.config(
    cloud_name="bz7q2jvr",
    api_key="268685199777982",
    api_secret="_vB12Emacg9H0Ox5-yvjcI6P7a0"
)
# CLOUDINARY_CLOUD_NAME=bz7q2jvr
# CLOUDINARY_API_KEY=268685199777982
# CLOUDINARY_API_SECRET=_vB12Emacg9H0Ox5-yvjcI6P7a0



print("CLOUDINARY CONFIGURED")


result = cloudinary.uploader.upload(
    "priyanshu2.jpg"
)

print("UPLOAD DONE")

print(result["secure_url"])