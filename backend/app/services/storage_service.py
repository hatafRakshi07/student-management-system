import os
import uuid
import httpx
from app.config import settings


class StorageService:
    def __init__(self):
        self.supabase_url = settings.supabase_url.rstrip('/') if settings.supabase_url else ""
        self.service_key = settings.supabase_service_key
        self.is_supabase_configured = bool(self.supabase_url and self.service_key)

    async def upload_file(self, file_content: bytes, original_filename: str, bucket_name: str = "submissions", content_type: str = None) -> str:
        """
        Uploads file to Supabase Storage bucket if configured, else saves to local uploads directory.
        Returns the public URL or relative file path.
        """
        ext = os.path.splitext(original_filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        if self.is_supabase_configured:
            try:
                url = f"{self.supabase_url}/storage/v1/object/{bucket_name}/{unique_filename}"
                headers = {
                    "Authorization": f"Bearer {self.service_key}",
                    "apiKey": self.service_key,
                    "x-upsert": "true"
                }
                if content_type:
                    headers["Content-Type"] = content_type

                async with httpx.AsyncClient() as client:
                    response = await client.post(url, content=file_content, headers=headers, timeout=15.0)
                    if response.status_code in (200, 201):
                        return f"{self.supabase_url}/storage/v1/object/public/{bucket_name}/{unique_filename}"
                    else:
                        print(f"Supabase storage upload error ({response.status_code}): {response.text}")
            except Exception as e:
                print(f"Failed uploading to Supabase storage: {e}. Falling back to local disk.")

        # Fallback to Local Disk
        local_folder = os.path.join(settings.upload_dir, bucket_name)
        os.makedirs(local_folder, exist_ok=True)
        local_path = os.path.join(local_folder, unique_filename)
        
        with open(local_path, "wb") as f:
            f.write(file_content)

        return f"/uploads/{bucket_name}/{unique_filename}"


storage_service = StorageService()
