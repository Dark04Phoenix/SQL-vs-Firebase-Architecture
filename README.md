# SQL vs Firebase Architecture

This project demonstrates the architectural and practical differences between a relational SQL database and a NoSQL Firebase Realtime Database.

The goal of the project is to compare:

- Data structure
- CRUD operations
- Data consistency
- Security handling
- Real-time synchronization
- Backend architecture

---

## 🔹 Project Structure

### 1️⃣ FirebaseToDoApp
A frontend-based web application connected to Firebase Realtime Database.

Features:
- Create tasks
- Edit tasks
- Delete tasks
- Toggle task completion (isDone)
- Real-time synchronization
- Firebase security rules implemented

Technologies:
- HTML
- CSS
- JavaScript
- Firebase Realtime Database

---

### 2️⃣ SqlTodoApi
A REST API built with ASP.NET Core connected to SQL Server.

Features:
- CRUD operations
- Entity Framework Core
- SQL relational schema
- Migrations
- Structured database design

Technologies:
- C#
- ASP.NET Core (.NET 8)
- Entity Framework Core
- SQL Server

---

## 🏗 Architectural Comparison

| SQL | Firebase |
|------|----------|
| Structured relational model | JSON tree structure |
| Strong consistency | Eventual consistency |
| Backend API required | Direct frontend connection |
| Explicit schema | Flexible schema |

---

## 🚀 How to Run

### SQL Version
1. Open SqlTodoApi in Visual Studio
2. Run migrations
3. Start the API

### Firebase Version
1. Open index.html
2. Ensure Firebase configuration is correct
3. Run using Live Server

---

## 🎯 Purpose

This project was created as part of an academic comparison between SQL and NoSQL database systems.

It demonstrates architectural differences, security handling, and data consi
