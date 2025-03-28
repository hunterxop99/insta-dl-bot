import requests
import pymongo
from telegram import Update, Bot
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext

# Replace with your credentials
BOT_TOKEN = "YOUR_BOT_TOKEN"
API_URL = "https://alphaapis.org/Instagram/dl/v1?url={}"
ADMIN_ID = YOUR_ADMIN_ID  # Replace with your Telegram user ID
MONGO_URL = "YOUR_MONGODB_URL"  # Replace with your MongoDB connection URL

# Connect to MongoDB
client = pymongo.MongoClient(MONGO_URL)
db = client["InstagramBot"]
users_col = db["users"]
downloads_col = db["downloads"]

def start(update: Update, context: CallbackContext):
    user_id = update.message.chat_id
    if not users_col.find_one({"user_id": user_id}):
        users_col.insert_one({"user_id": user_id, "subscribed": True})
    
    welcome_message = (
        "👋 **Welcome to Insta Video Downloader Bot!**\n\n"
        "📌 Send me any Instagram video link, and I'll fetch it for you instantly!\n\n"
        "🔹 Fast & Free\n"
        "🔹 No Watermark\n"
        "🔹 Unlimited Downloads\n\n"
        "🚀 Just send the link and get started!\n\n"
        "✨ *Made By @WizardBillu*"
    )
    update.message.reply_text(welcome_message, parse_mode="Markdown")

def download_instagram_video(update: Update, context: CallbackContext):
    url = update.message.text
    update.message.reply_text("Fetching video...\n\n✨ *Made By @WizardBillu*")
    
    response = requests.get(API_URL.format(url)).json()
    
    if response.get("success") and response.get("result"):
        video_url = response["result"][0]["downloadLink"]
        context.bot.send_video(chat_id=update.message.chat_id, video=video_url, caption="✨ *Made By @WizardBillu*", parse_mode="Markdown")
        downloads_col.insert_one({"user_id": update.message.chat_id, "video_url": video_url})
    else:
        update.message.reply_text("❌ Failed to download video. Make sure the URL is correct and try again.\n\n✨ *Made By @WizardBillu*")

def broadcast(update: Update, context: CallbackContext):
    if update.message.chat_id != ADMIN_ID:
        return
    
    if not update.message.reply_to_message:
        update.message.reply_text("Reply to a message with /broadcast to send it to all users.\n\n✨ *Made By @WizardBillu*", parse_mode="Markdown")
        return
    
    message = update.message.reply_to_message
    success_count, failed_count = 0, 0
    
    for user in users_col.find():
        user_id = user["user_id"]
        try:
            context.bot.forward_message(chat_id=user_id, from_chat_id=message.chat_id, message_id=message.message_id)
            success_count += 1
        except Exception:
            failed_count += 1
    
    result_message = f"📢 **Broadcast Results**\n\n✅ Success: {success_count}\n❌ Failed: {failed_count}\n\n✨ *Made By @WizardBillu*"
    update.message.reply_text(result_message, parse_mode="Markdown")

def stats(update: Update, context: CallbackContext):
    if update.message.chat_id != ADMIN_ID:
        return
    
    total_users = users_col.count_documents({})
    total_downloads = downloads_col.count_documents({})
    total_subscribers = users_col.count_documents({"subscribed": True})
    
    stats_message = (
        f"📊 **Bot Stats**\n\n"
        f"👥 Total Users: {total_users}\n"
        f"⬇️ Total Downloads: {total_downloads}\n"
        f"🔔 Total Subscribers: {total_subscribers}\n\n"
        "✨ *Made By @WizardBillu*"
    )
    update.message.reply_text(stats_message, parse_mode="Markdown")

def main():
    updater = Updater(BOT_TOKEN, use_context=True)
    dp = updater.dispatcher
    
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(MessageHandler(Filters.text & ~Filters.command, download_instagram_video))
    dp.add_handler(CommandHandler("broadcast", broadcast))
    dp.add_handler(CommandHandler("stats", stats))
    
    updater.start_polling()
    updater.idle()

if __name__ == "__main__":
    main()
