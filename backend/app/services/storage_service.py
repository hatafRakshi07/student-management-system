import os
import uuid
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self):
        self.supabase_url = settings.supabase_url.rstrip('/') if settings.supabase_url else ""
        self.service_key = settings.supabase_service_key
        self.default_bucket = getattr(settings, 'supabase_storage_bucket', 'sms-uploads')
        self.is_supabase_configured = bool(self.supabase_url and self.service_key)

    async def ensure_bucket_exists(self, bucket_name: str) -> bool:
        """Ensure Supabase storage bucket exists with public read access."""
        if not self.is_supabase_configured:
            return False
        try:
            url = f"{self.supabase_url}/storage/v1/bucket"
            headers = {
                "Authorization": f"Bearer {self.service_key}",
                "apiKey": self.service_key,
                "Content-Type": "application/json",
            }
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{url}/{bucket_name}", headers=headers, timeout=5.0)
                if resp.status_code == 200:
                    return True
                # Create if not found
                create_payload = {"id": bucket_name, "name": bucket_name, "public": True}
                create_resp = await client.post(url, json=create_payload, headers=headers, timeout=5.0)
                return create_resp.status_code in (200, 201)
        except Exception as e:
            logger.warning(f"Bucket check/create notice for '{bucket_name}': {e}")
            return False

    async def upload_file(
        self,
        file_content: bytes,
        original_filename: str,
        bucket_name: str = "submissions",
        content_type: str = None,
    ) -> str:
        """
        Uploads file to Supabase Object Storage bucket if configured,
        else saves to local uploads directory with serverless-safe fallback.
        Returns the public URL or relative file path.
        """
        ext = os.path.splitext(original_filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"

        if self.is_supabase_configured:
            try:
                # Ensure bucket exists
                await self.ensure_bucket_exists(bucket_name)

                url = f"{self.supabase_url}/storage/v1/object/{bucket_name}/{unique_filename}"
                headers = {
                    "Authorization": f"Bearer {self.service_key}",
                    "apiKey": self.service_key,
                    "x-upsert": "true",
                }
                if content_type:
                    headers["Content-Type"] = content_type

                async with httpx.AsyncClient() as client:
                    response = await client.post(url, content=file_content, headers=headers, timeout=20.0)
                    if response.status_code in (200, 201):
                        return f"{self.supabase_url}/storage/v1/object/public/{bucket_name}/{unique_filename}"
                    else:
                        logger.error(f"Supabase storage upload error ({response.status_code}): {response.text}")
            except Exception as e:
                logger.error(f"Failed uploading to Supabase storage: {e}. Falling back to local disk.")

        # Fallback to Local Disk
        upload_base = settings.ensure_upload_dir()
        local_folder = os.path.join(upload_base, bucket_name)
        try:
            os.makedirs(local_folder, exist_ok=True)
        except OSError as err:
            logger.warning(f"Local storage directory creation notice ({err}).")

        local_path = os.path.join(local_folder, unique_filename)
        with open(local_path, "wb") as f:
            f.write(file_content)

        return f"/uploads/{bucket_name}/{unique_filename}"

    async def delete_file(self, file_path_or_url: str, bucket_name: str = "submissions") -> bool:
        """Deletes file from Supabase Storage or local disk."""
        if not file_path_or_url:
            return False

        if self.is_supabase_configured and file_path_or_url.startswith("http"):
            try:
                filename = file_path_or_url.split("/")[-1]
                url = f"{self.supabase_url}/storage/v1/object/{bucket_name}/{filename}"
                headers = {
                    "Authorization": f"Bearer {self.service_key}",
                    "apiKey": self.service_key,
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.delete(url, headers=headers, timeout=10.0)
                    return resp.status_code in (200, 204)
            except Exception as e:
                logger.warning(f"Error deleting from Supabase storage: {e}")
                return False

        # Local disk deletion
        try:
            clean_path = file_path_or_url.lstrip("/")
            if clean_path.startswith("uploads/"):
                clean_path = clean_path.replace("uploads/", "", 1)
            full_path = os.path.join(settings.upload_dir, clean_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
        except Exception as e:
            logger.warning(f"Error deleting local file: {e}")
        return False


storage_service = StorageService()
