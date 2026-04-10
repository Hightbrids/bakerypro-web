```
🧪 Inventory & Recipe Management System

A full-stack web application for managing ingredients, products, recipes, and stock movements.
This system is designed to simulate a real-world inventory workflow including production, refill, and tracking ingredient usage.

🚀 Key Features
📦 Product & Ingredient Management
🧾 Recipe Management (link ingredients to products)
🔄 Stock Movement Tracking (produce / refill)
🗂️ Category Management
📊 Batch tracking system
🔐 Basic authentication (Sign-in system)
🧠 What This Project Demonstrates

This project highlights my ability to:

Design and structure a scalable backend system
Implement CRUD operations across multiple modules
Manage relational data (products, ingredients, recipes)
Build dynamic UI using EJS templating
Organize code into clean MVC-like architecture

project-root/
│
├── public/
│   ├── app.js
│   └── style.css
│
├── repo/
│   ├── DatabaseImg/
│   ├── routes/
│   │   ├── actions.js
│   │   ├── batches.js
│   │   ├── categories.js
│   │   ├── ingredientMovements.js
│   │   ├── ingredients.js
│   │   ├── products.js
│   │   └── recipes.js
│   │
│   ├── views/
│   │   ├── actions/
│   │   │   ├── produce.ejs
│   │   │   └── refill.ejs
│   │   │
│   │   ├── batches/
│   │   │   └── list.ejs
│   │   │
│   │   ├── categories/
│   │   │   ├── form.ejs
│   │   │   └── list.ejs
│   │   │
│   │   ├── ingredientMovements/
│   │   │   ├── form.ejs
│   │   │   └── list.ejs
│   │   │
│   │   ├── ingredients/
│   │   │   ├── form.ejs
│   │   │   └── list.ejs
│   │   │
│   │   ├── partials/
│   │   │   ├── nav.ejs
│   │   │   └── alert.ejs
│   │   │
│   │   ├── products/
│   │   │   ├── form.ejs
│   │   │   └── list.ejs
│   │   │
│   │   ├── recipes/
│   │   │   ├── form.ejs
│   │   │   └── list.ejs
│   │   │
│   │   ├── home.ejs
│   │   ├── layout.ejs
│   │   └── signin.ejs
│
├── db.js
├── ejs.js
├── server.js
├── upload.js
├── package.json
├── package-lock.json
└── README.md

expline
git clone https://github.com/your-username/inventory-system.git
step 2
npm install
step3 set
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=inventory_db
step4
node server.js or npm start
wait for link after npmstart http://localhost:3000

About Me
Name: Autsadayus Sribua
Role: Junior Web Developer
```
