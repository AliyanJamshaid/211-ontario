const { MongoClient } = require("mongodb");

// Your MongoDB connection with database name included
const url =
  "mongodb://admin:Libking16*@98.81.94.65:27017/leomans?authSource=admin";

async function addData() {
  const client = new MongoClient(url);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected!\n");

    const db = client.db();

    // 1. Add single user
    console.log("📝 Adding single user...");
    const usersCollection = db.collection("users");
    const singleUser = await usersCollection.insertOne({
      name: "John Doe",
      email: "john@example.com",
      age: 30,
      city: "New York",
      createdAt: new Date(),
    });
    console.log(`   ✅ Inserted user with ID: ${singleUser.insertedId}\n`);

    // 2. Add multiple users
    console.log("📝 Adding multiple users...");
    const multipleUsers = await usersCollection.insertMany([
      {
        name: "Jane Smith",
        email: "jane@example.com",
        age: 25,
        city: "Los Angeles",
        createdAt: new Date(),
      },
      {
        name: "Bob Johnson",
        email: "bob@example.com",
        age: 35,
        city: "Chicago",
        createdAt: new Date(),
      },
      {
        name: "Alice Williams",
        email: "alice@example.com",
        age: 28,
        city: "Houston",
        createdAt: new Date(),
      },
    ]);
    console.log(`   ✅ Inserted ${multipleUsers.insertedCount} users\n`);

    // 3. Add products
    console.log("📝 Adding products...");
    const productsCollection = db.collection("products");
    const products = await productsCollection.insertMany([
      {
        name: "Laptop",
        price: 999.99,
        category: "Electronics",
        stock: 50,
        createdAt: new Date(),
      },
      {
        name: "Phone",
        price: 599.99,
        category: "Electronics",
        stock: 100,
        createdAt: new Date(),
      },
      {
        name: "Desk",
        price: 299.99,
        category: "Furniture",
        stock: 25,
        createdAt: new Date(),
      },
      {
        name: "Chair",
        price: 149.99,
        category: "Furniture",
        stock: 40,
        createdAt: new Date(),
      },
    ]);
    console.log(`   ✅ Inserted ${products.insertedCount} products\n`);

    // 4. Add orders
    console.log("📝 Adding orders...");
    const ordersCollection = db.collection("orders");
    const orders = await ordersCollection.insertMany([
      {
        userId: singleUser.insertedId,
        items: [
          { productName: "Laptop", quantity: 1, price: 999.99 },
          { productName: "Phone", quantity: 2, price: 599.99 },
        ],
        total: 2199.97,
        status: "pending",
        orderDate: new Date(),
      },
      {
        userId: singleUser.insertedId,
        items: [{ productName: "Chair", quantity: 4, price: 149.99 }],
        total: 599.96,
        status: "shipped",
        orderDate: new Date(),
      },
    ]);
    console.log(`   ✅ Inserted ${orders.insertedCount} orders\n`);

    // 5. Display summary
    console.log("═══════════════════════════════════════");
    console.log("  📊 Database Summary");
    console.log("═══════════════════════════════════════");
    const userCount = await usersCollection.countDocuments();
    const productCount = await productsCollection.countDocuments();
    const orderCount = await ordersCollection.countDocuments();

    console.log(`👥 Total Users: ${userCount}`);
    console.log(`📦 Total Products: ${productCount}`);
    console.log(`🛒 Total Orders: ${orderCount}`);
    console.log("═══════════════════════════════════════\n");

    // 6. Read some data
    console.log("📖 Sample Data:");
    console.log("\nUsers:");
    const allUsers = await usersCollection.find({}).limit(3).toArray();
    allUsers.forEach((user) => {
      console.log(`  - ${user.name} (${user.email}) - ${user.city}`);
    });

    console.log("\nProducts:");
    const allProducts = await productsCollection.find({}).limit(3).toArray();
    allProducts.forEach((product) => {
      console.log(
        `  - ${product.name}: $${product.price} (Stock: ${product.stock})`
      );
    });

    console.log("\n🎉 Data added successfully!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("🔌 Connection closed\n");
  }
}

addData();
