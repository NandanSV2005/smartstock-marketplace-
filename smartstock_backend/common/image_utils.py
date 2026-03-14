import os
import shutil
from icrawler.builtin import BingImageCrawler
from django.conf import settings
from django.core.files import File

def fetch_image_for_product(product_name, brand=""):
    """
    Search for a product image using Bing search and return a Django File object.
    """
    query = f"{product_name} {brand} product".strip()
    temp_dir = os.path.join(settings.BASE_DIR, 'temp_images')
    
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    # Clean up previous downloads in the temp dir if any
    for f in os.listdir(temp_dir):
        os.remove(os.path.join(temp_dir, f))
        
    try:
        crawler = BingImageCrawler(storage={'root_dir': temp_dir}, log_level=50) # log_level=50 is CRITICAL (silence)
        crawler.crawl(keyword=query, max_num=1)
        
        downloaded_files = os.listdir(temp_dir)
        if downloaded_files:
            file_path = os.path.join(temp_dir, downloaded_files[0])
            return File(open(file_path, 'rb'), name=downloaded_files[0])
    except Exception as e:
        print(f"Error auto-fetching image for {query}: {e}")
        
    return None
