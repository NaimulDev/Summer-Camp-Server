const express = require("express");
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER}:${process.env.SECRET_KEY}@cluster0.gflxnku.mongodb.net/?retryWrites=true&w=majority`;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // ----------------------------------COLLECTION----------------------------------
    const usersCollection = client.db("Pallikoodam").collection("users");
    const classCollection = client.db("Pallikoodam").collection("classes");
    const myClassCollection = client.db("Pallikoodam").collection("myclass");
    const bookMarkCollection = client.db("Pallikoodam").collection("bookMarks");
    const feedbackCollection = client.db("Pallikoodam").collection("feedback");
    const paymentCollection = client.db("Pallikoodam").collection("payments");

    // const usersCollection = client.db("zone").collection("users");
    // const allClassesCollection = client.db("zone").collection("allClasses");
    // const myClassesCollection = client.db("zone").collection("myClasses");

    // const mySelectedClassesCollection = client
    //   .db("zone")
    //   .collection("mySelectedClasses");

    // const myEnrolledClassesCollection = client
    //   .db("zone")
    //   .collection("myEnrolledClasses");
    // const enrolledStudentsCollection = client
    //   .db("zone")
    //   .collection("enrolledStudents");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    // Warning: use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    // Warning: use verifyJWT before using verifyAdmin
    const verifyIns = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "instractor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    // users related apis
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // security layer: verifyJWT
    // email same
    // check admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/users/instractor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instractor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instractor: user?.role === "instractor" };
      res.send(result);
    });

    app.patch("/users/instractor/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instractor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // ----------------------------------STUDENTS START----------------------------------

    // app.post("/enrolled-students", verifyJWT, async (req, res) => {
    //   const newItem = req.body;
    //   const result = await enrolledStudentsCollection.insertOne(newItem);
    //   res.send(result);
    // });

    // app.get("/enrolledStudents/:email", verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   if (!email) {
    //     res.send([]);
    //   }
    //   const decodedEmail = req.decoded.email;
    //   if (email !== decodedEmail) {
    //     return res
    //       .status(403)
    //       .send({ error: true, message: "forbidden access" });
    //   }
    //   const query = { email: email };
    //   const result = await enrolledStudentsCollection.find(query).toArray();
    //   res.send(result);
    // });

    app.get("/bookmark", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { email: email };
      const result = await bookMarkCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/mySelectedClasses/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await mySelectedClassesCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/myEnrolledClasses", verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await myEnrolledClassesCollection.insertOne(newItem);
      res.send(result);
    });

    // after successfully payment increase 1 on this classes
    app.patch("/all-classes/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const { availableSeats, enrolledStudents } = req.body;
      console.log(id, availableSeats, enrolledStudents);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          availableSeats: parseInt(availableSeats),
          enrolledStudents: parseInt(enrolledStudents),
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/myenrolledclasses/:email", verifyJWT, async (req, res) => {
      const result = await myEnrolledClassesCollection
        .find({
          email: req.params.email,
        })
        .toArray();
      res.send(result);
    });

    // app.get("/bookmark", verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   if (!email) {
    //     res.send([]);
    //   }
    //   const decodedEmail = req.decoded.email;
    //   if (email !== decodedEmail) {
    //     return res
    //       .status(403)
    //       .send({ error: true, message: "forbidden access" });
    //   }
    //   const query = { email: email };
    //   const result = await bookMarkCollection.find(query).toArray();
    //   res.send(result);
    // });

    app.post("/mySelectedClasses", async (req, res) => {
      const newItem = req.body;
      const result = await bookMarkCollection.insertOne(newItem);
      res.send(result);
    });

    // bookMarks api
    app.get("/bookMarks", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookMarkCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookmark", async (req, res) => {
      const item = req.body;
      const result = await bookMarkCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/bookmark/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookMarkCollection.deleteOne(query);
      res.send(result);
    });

    // ----------------------------------STUDENTS END----------------------------------

    // ----------------------------------INSTRUCTORS START----------------------------------

    // menu related apis
    app.get("/class", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    // app.post("/class", verifyJWT, verifyIns, async (req, res) => {
    //   const newItem = req.body;
    //   const result = await classCollection.insertOne(newItem);
    //   res.send(result);
    // });

    // app.delete("/class/:id", verifyJWT, verifyIns, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await classCollection.deleteOne(query);
    //   res.send(result);
    // });
    // clinet Site instractor my added class route
    app.get("/myaddedclass", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/addclasses", verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await classCollection.insertOne(newItem);
      res.send(result);
    });

    // app.get("/addclasses/:email", verifyJWT, async (req, res) => {
    //   const result = await classCollection
    //     .find({
    //       instructorEmail: req.params.email,
    //     })
    //     .toArray();
    //   res.send(result);
    // });

    app.delete("/myClasses/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myClassCollection.deleteOne(query);
      if (result.deletedCount > 0) {
        res.json({ success: true, message: "Item deleted successfully" });
      } else {
        res.status(404).json({ success: false, message: "Item not found" });
      }
    });

    // ----------------------------------INSTRUCTORS END----------------------------------

    // ----------------------------------ADMIN START----------------------------------
    app.get("/all-classes", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.patch("/classes/approved/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/classes/deny/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.post("/feedback", verifyJWT, async (req, res) => {
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    app.patch("/feedback/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const { feedback } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          adminFeedback: feedback,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/instructor/:email", verifyJWT, async (req, res) => {
      const result = await feedbackCollection
        .find({
          instructorEmail: req.params.email,
        })
        .toArray();
      res.send(result);
    });

    // ----------------------------------ADMIN END----------------------------------

    // ============================

    // =================================

    // cart collection apis
    // app.get("/class", async (req, res) => {
    //   const cursor = await classCollection.find().toArray();
    //   res.send(cursor);
    // });
    //=========================Selected Class added BOokmarks
    // app.get("/bookmark/:email", verifyJWT, async (req, res) => {
    //   const email = req.query.email;

    //   if (!email) {
    //     res.send([]);
    //   }

    //   const decodedEmail = req.decoded.email;
    //   if (email !== decodedEmail) {
    //     return res
    //       .status(403)
    //       .send({ error: true, message: "forbidden access" });
    //   }

    //   const query = { email: email };
    //   const result = await bookMarkCollection.find(query).toArray();
    //   res.send(result);
    // });

    //===============Payment============

    //get one item booking
    app.get("/singleBookMarks/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookMarkCollection.findOne(query);
      res.send(result);
    });

    // Payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Payment
    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      res.send({ insertResult });
    });

    // Payment
    app.put("/paymentBookMaker/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: "paid",
        },
      };
      const result = await bookMarkCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pallikoodam is sitting");
});

app.listen(port, () => {
  console.log(`Pallikoodam is sitting on port ${port}`);
});
