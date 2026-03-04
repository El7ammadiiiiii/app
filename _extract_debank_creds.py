"""
DeBank Credentials Extractor
============================
هذا السكريبت يساعدك على استخراج القيم المطلوبة من متصفحك للاتصال بـ DeBank API.

الخطوات:
1. افتح https://debank.com في Chrome
2. افتح DevTools (F12) → Network tab
3. أعد تحميل الصفحة
4. ابحث عن أي طلب إلى api.debank.com
5. انقر على الطلب → Headers tab
6. ابحث عن هذه القيم في Request Headers:
   - x-api-key
   - x-api-time
   - account (هذا JSON يحتوي على random_at و random_id)

بعد الحصول على القيم، شغّل هذا السكريبت وأدخلها.
"""

import json
import os
import sys

def extract_account_values(account_json: str) -> tuple:
    """استخراج random_at و random_id من account header."""
    try:
        data = json.loads(account_json)
        return str(data.get("random_at", "")), data.get("random_id", "")
    except json.JSONDecodeError:
        return None, None

def update_beta_client(api_key: str, session_time: str, session_random: str):
    """تحديث ملف beta/client.py بالقيم الجديدة."""
    client_path = os.path.join(
        os.path.dirname(__file__),
        "api-hub", "blockchain", "providers", "beta", "client.py"
    )
    
    if not os.path.exists(client_path):
        print(f"❌ الملف غير موجود: {client_path}")
        return False
    
    with open(client_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # تحديث القيم
    import re
    
    # Update _BETA_STATIC_KEY
    content = re.sub(
        r'_BETA_STATIC_KEY = "[^"]*"',
        f'_BETA_STATIC_KEY = "{api_key}"',
        content
    )
    
    # Update _BETA_SESSION_TIME
    content = re.sub(
        r'_BETA_SESSION_TIME = "[^"]*"',
        f'_BETA_SESSION_TIME = "{session_time}"',
        content
    )
    
    # Update _BETA_SESSION_RANDOM
    content = re.sub(
        r'_BETA_SESSION_RANDOM = "[^"]*"',
        f'_BETA_SESSION_RANDOM = "{session_random}"',
        content
    )
    
    with open(client_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✅ تم تحديث {client_path}")
    return True

def main():
    print("=" * 60)
    print("   DeBank Credentials Extractor")
    print("=" * 60)
    print()
    print("📋 الخطوات للحصول على القيم:")
    print("   1. افتح https://debank.com في Chrome")
    print("   2. افتح DevTools (F12) → Network tab")
    print("   3. أعد تحميل الصفحة")
    print("   4. ابحث عن طلب إلى api.debank.com (مثل /user/xxx)")
    print("   5. انقر على الطلب → Headers tab")
    print("   6. انسخ القيم من Request Headers")
    print()
    print("-" * 60)
    
    # Input x-api-key
    print("\n🔑 أدخل x-api-key:")
    print("   (مثال: 78730c11-5792-43b1-bd09-a5b7c918422a)")
    api_key = input("   > ").strip()
    if not api_key:
        print("❌ القيمة مطلوبة")
        return
    
    # Input account header
    print("\n📦 أدخل account header (JSON كامل):")
    print('   (مثال: {"random_at":1772318336,"random_id":"167081e5...",...})')
    print("   أو أدخل 'skip' لإدخال القيم يدوياً")
    account_input = input("   > ").strip()
    
    if account_input.lower() == "skip":
        print("\n⏱️ أدخل x-api-time / random_at:")
        session_time = input("   > ").strip()
        
        print("\n🎲 أدخل random_id:")
        session_random = input("   > ").strip()
    else:
        session_time, session_random = extract_account_values(account_input)
        if not session_time or not session_random:
            print("❌ لم يتم استخراج القيم من account header")
            print("   جرب إدخال 'skip' للإدخال اليدوي")
            return
    
    print("\n" + "-" * 60)
    print("📝 القيم المستخرجة:")
    print(f"   x-api-key:    {api_key}")
    print(f"   session_time: {session_time}")
    print(f"   random_id:    {session_random}")
    print("-" * 60)
    
    confirm = input("\n✅ هل تريد تحديث الملف؟ (y/n): ").strip().lower()
    if confirm == "y":
        if update_beta_client(api_key, session_time, session_random):
            print("\n🎉 تم التحديث بنجاح!")
            print("   الآن قم بإعادة تشغيل الـ API server:")
            print("   pm2 restart ccways-api")
        else:
            print("\n❌ فشل التحديث")
    else:
        print("\n⏭️ تم إلغاء التحديث")
        print("\nيمكنك تحديث الملف يدوياً:")
        print(f"   api-hub/blockchain/providers/beta/client.py")
        print(f"\n   _BETA_STATIC_KEY = \"{api_key}\"")
        print(f"   _BETA_SESSION_TIME = \"{session_time}\"")
        print(f"   _BETA_SESSION_RANDOM = \"{session_random}\"")

if __name__ == "__main__":
    main()
