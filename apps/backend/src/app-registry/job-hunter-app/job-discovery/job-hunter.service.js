'use strict';

const axios = require('axios');
// For MVP, we can simulate pdf parsing or use a basic text extractor
// In production, you'd use 'pdf-parse' or similar

const getOpenAIClient = () => {
    // Uses the global platform OpenAI key or a user-configured one
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    return apiKey;
};

exports.parseResumeFile = async (fileBuffer, mimetype) => {
    // 1. Extract text from PDF/Docx
    // (Stubbing extraction for MVP. In reality, you'd use pdf-parse)
    const resumeText = "Extracted text from buffer would go here. Name: John Doe. Skills: React, Node.js...";

    // 2. Call OpenAI to structure it
    const apiKey = getOpenAIClient();
    
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert HR parser. Extract the following from the resume text into a strict JSON object: headline, summary, skills (array of strings), experience (array of objects with company, role, description), education, projects.'
                    },
                    { role: 'user', content: resumeText }
                ],
                response_format: { type: 'json_object' }
            },
            { headers: { Authorization: `Bearer ${apiKey}` } }
        );

        const content = response.data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('OpenAI Parsing Error:', error.response?.data || error.message);
        // Fallback dummy data for MVP testing if API key fails
        return {
            headline: "Software Engineer",
            summary: "Experienced developer",
            skills: ["JavaScript", "React"],
            experience: [],
            education: [],
            projects: []
        };
    }
};

exports.generateCoverLetter = async (profile, job) => {
    const apiKey = getOpenAIClient();
    
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert career coach. Write a short, highly tailored email cover letter for this candidate applying to this job. Do not include placeholders like [Your Name].'
                    },
                    { 
                        role: 'user', 
                        content: `Candidate Profile: ${JSON.stringify(profile.skills)} \nJob: ${job.title} at ${job.companyName}\nDescription: ${job.description}` 
                    }
                ]
            },
            { headers: { Authorization: `Bearer ${apiKey}` } }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        return "I am very interested in this role and my skills perfectly match your requirements. Please find my resume attached.";
    }
};
