const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://proctoring:Aryan%407973@cluster0.0fgriik.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const logSchema = new mongoose.Schema({
    message:String,
    Timestamp:Date,
});

const interviewSchema = new mongoose.Schema({
    candidateName : String,
    startedAt: {type: Date, default: Date.now},
    endedAt: Date,
    logs: [logSchema],
});

const Interview  = mongoose.model("Interview",interviewSchema);

app.post("/interviews",async(req,res)=>{
    const interview = new Interview({candidateName: req.body.candidateName});
    await interview.save();
    res.json(interview);
});

app.post("/interviews/:id/logs",async(req,res)=>{
    const interview = await Interview.findById(req.params.id);
    if(!interview) return res.status(404).send("Interview not found");
    interview.logs.push({message: req.body.message, Timestamp: new Date()});
    await interview.save();
    res.json(interview);
});

app.post("/interviews/:id/logs/batch", async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) return res.status(404).send("Interview not found");

        if (!Array.isArray(req.body.logs)) {
            return res.status(400).send("Logs must be an array");
        }

        req.body.logs.forEach((log) => {
            interview.logs.push({
                message: log,
                Timestamp: new Date(),
            });
        });

        await interview.save();
        res.json({ message: "Logs saved successfully", logs: interview.logs });
    } catch (error) {
        console.error("Error saving batch logs:", error);
        res.status(500).send("Internal server error");
    }
});

app.patch("/interviews/:id/end",async(req,res)=>{
    const interview = await Interview.findByIdAndUpdate(
        req.params.id,
        {endedAt: new Date()},
        {new: true}
    );
    res.json(interview);
});

app.get("/interviews",async(req,res)=>{
    const interviews = await Interview.find().sort({startedAt: -1});
    res.json(interviews);
});

app.listen(5000,()=> console.log("Server started on port 5000"));


