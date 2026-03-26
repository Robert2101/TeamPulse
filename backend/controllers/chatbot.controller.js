import { GoogleGenAI } from '@google/genai';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import ChatbotInteraction from '../models/chatbotInteraction.model.js';
import logger from '../utils/logger.js';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export const askChatbot = async (req, res) => {
    try {
        const { query } = req.body;
        const userId = req.dbUser._id;

        if (!query) {
            return res.status(400).json({ message: "Query is required." });
        }

        const userProjects = await Project.find({
            $or: [
                { projectManager: userId },
                { assignedTeamMembers: userId }
            ]
        }).select('projectName projectStatus endDate');

        // Fetch user's active tasks
        const userTasks = await Task.find({
            assignee: userId,
            taskStatus: { $ne: 'Done' }
        }).select('taskName priority dueDate taskStatus projectReference');

        // PREVENT TOKEN EXPLOSION: Map data into clean, readable text strings instead of raw JSON
        const projectSummary = userProjects.length > 0
            ? userProjects.map(p => `- ${p.projectName} (Status: ${p.projectStatus})`).join("\n")
            : "No active projects.";

        const taskSummary = userTasks.length > 0
            ? userTasks.map(t => `- ${t.taskName} (Priority: ${t.priority}, Status: ${t.taskStatus})`).join("\n")
            : "No pending tasks.";

        const systemInstruction = `
            You are an AI assistant built directly into a Team Collaboration Platform. 
            Your goal is to help the user manage their work.
            
            Here is the user's current live data:
            - Their Name: ${req.dbUser.fullName}
            
            Active Projects: 
            ${projectSummary}
            
            Pending Tasks: 
            ${taskSummary}

            Rules:
            1. Only answer based on the provided data. If they ask about a project not in the list, tell them they don't have access.
            2. Be concise, professional, and helpful. Do not use raw database IDs.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: query,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2
            }
        });

        const botReply = response.text;

        const interactionLog = new ChatbotInteraction({
            user: userId,
            query: query,
            responseGenerated: botReply,
            classifiedIntent: "task_query" 
        });
        await interactionLog.save();

        logger.info(`🤖 Chatbot answered query for User ID: ${userId}`);
        res.status(200).json({ reply: botReply });

    } catch (error) {
        logger.error(`Chatbot Error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: "Failed to communicate with the AI assistant." });
    }
};