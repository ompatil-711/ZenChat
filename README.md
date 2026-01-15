# 💬 ZenChat - Scalable Microservices Chat Platform

![ZenChat Status](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)
![ZenChat Tech](https://img.shields.io/badge/Stack-MERN_Microservices-blue?style=for-the-badge)


> **A robust, real-time messaging platform built with a Microservices architecture, combining instant communication with rich media sharing and fault-tolerant background processing.**

🌐 **Live Demo:** [https://zenchat.online](https://zenchat.online)

---

## 🚀 About The Project

**ZenChat** is an advanced engineering project designed to demonstrate **Event-Driven Architecture** and **Scalability**.

While it offers a seamless UI for users to chat and share images, the backend is decoupled into independent microservices. It uses **RabbitMQ** to handle asynchronous tasks (like OTP emails), ensuring the main chat server handles heavy real-time traffic without lag.

### 🎯 Key Engineering Highlights
* **Microservices Architecture:** Independent `User Service` (API/Socket) and `Mail Service` (Worker).
* **Self-Healing Workers:** Custom recursive reconnection logic ensures 99.9% uptime for RabbitMQ consumers, even on unstable networks.
* **Rate-Limit Protection:** Implemented `prefetch(1)` throttling to process email queues sequentially, preventing 3rd-party API crashes.
* **Rich Media Optimization:** Integrated **Cloudinary** and **Multer** for optimized, secure image storage and delivery.

---

## ✨ Features


### ⚡ Real-Time & Interactive
* **Instant Messaging:** Low-latency delivery using **Socket.io**.
* **Smart Indicators:** Real-time "Typing..." status and Online/Offline presence.
* **Read Receipts:** Blue ticks sync instantly across devices.

### 📸 Rich Media & UX
* **Image Sharing:** Send and receive photos securely, optimized via **Cloudinary**.
* **Responsive UI:** Mobile-first design built with **React** and **Tailwind CSS**.

### 🛡️ Security & Reliability
* **Secure Auth:** JWT-based login with **OTP Email Verification** (powered by RabbitMQ & Resend).
* **Fault Tolerance:** Automatic recovery from server "sleep" modes using Cron Jobs and Health Checks.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React.js (Vite), TypeScript, Tailwind CSS, Axios |
| **Backend API** | Node.js, Express.js, Socket.io |
| **Async Worker** | RabbitMQ (amqplib), Node.js |
| **Database** | MongoDB, Mongoose |
| **Media/Storage** | **Cloudinary**, **Multer** |
| **DevOps** | Render, Vercel, CloudAMQP, Docker |

---

## 🏗️ System Architecture


ZenChat separates real-time logic from heavy blocking tasks.

```mermaid
graph TD
    Client["React Client"] -->|HTTP / Socket / Image Upload| UserService["User Service (Node.js)"]
    UserService -->|Read/Write| DB[("MongoDB")]
    UserService -->|Upload Media| Cloudinary["Cloudinary Storage"]
    UserService -->|Publish OTP Event| Exchange{"RabbitMQ Exchange"}
    Exchange -->|Route| Queue["Queue: send-otp"]
    Queue -->|Consume & Prefetch 1| MailService["Mail Worker Service"]
    MailService -->|Send Email| ResendAPI["Resend API"]
    Cron["Uptime Monitor"] -->|Ping Keep-Alive| MailService
