# EventFlow: AI Reminder Agent

A modern, robust web application built to intelligently manage schedules and ensure you (and your clients) never miss an event again. Built with React and Vite, this application integrates automated communication workflows using Twilio.

## 🌟 Key Features

- **Interactive Calendar & Dashboard**: A beautiful, intuitive interface for scheduling events, managing tasks, and visualizing your upcoming week.
- **Smart WhatsApp Reminders**: Automatically queues and dispatches WhatsApp messages via Twilio as an event approaches.
- **Automated Voice Call Fallbacks**: If a WhatsApp reminder goes unread or fails, the application automatically places an AI-driven voice call to the recipient using Twilio.
- **Secure Authentication**: Complete user authentication system ensuring data privacy.
- **Modern UI/UX**: Built with a responsive, glassmorphic design system featuring fluid animations, dark mode, and a polished aesthetic.

## 🛠️ Technology Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend/Integrations:** Twilio API (WhatsApp and Programmable Voice)
- **Data Persistence:** Local Storage Mock (Ready for Firebase Cloud integration)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Twilio account (for WhatsApp and Voice APIs)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/EventFlow.git
   cd EventFlow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Twilio credentials:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   TWILIO_WHATSAPP_NUMBER=your_whatsapp_number
   ```
   > **Note on WhatsApp Keywords (`join <keyword>`)**: By default, `+14155238886` is Twilio's shared Sandbox number. Anyone receiving messages from it must send `join <keyword>` every 72 hours.
   > **To send automated WhatsApp messages without users ever sending `join <keyword>`**:
   > In your [Twilio Console](https://console.twilio.com) -> *Messaging -> Senders -> WhatsApp Senders*, register your `TWILIO_PHONE_NUMBER` as a WhatsApp Business Sender. Once approved (~2 mins), replace `+14155238886` with your registered number!

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🔒 Security Note
This repository uses local environment variables to proxy API requests in development. Never commit your `.env` file containing actual API keys to GitHub.
