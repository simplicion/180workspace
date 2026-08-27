// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';
import * as salesMath from '../utils/salesMath';
const bcrypt = require('bcryptjs');

export class ContractSalesService {
static async analyzeContract(text) {
        if (!text) throw new Error('Contract text is required');

        const prompt = `
            Act as an advocate lawyer of the Supreme Court with 15 years of experience in contract analysis and creation for large corporations.
            Analyze the following client contract text and extract key information into a structured JSON format.
            Be extremely thorough in identifying any hidden constraints or potential issues for my company.
            The JSON MUST strictly have the following keys (no extra text):
            - "title": A concise title for the contract.
            - "parties": Array of strings representing the involved parties.
            - "value": The total monetary value mentioned, as a string or number.
            - "dates": Object with "effectiveDate" and "expirationDate".
            - "keyObligations": Array of 3-5 strings detailing main obligations.
            - "risks": Array of strings detailing potential issues, hidden terms, and constraints.

            Contract Text:
            """${text.substring(0, 10000)}"""
        `;

        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAPI_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key is missing. Cannot perform contract analysis.');
        }

        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2
        });

        let resultText = response.choices[0].message.content;
        if (resultText.startsWith('```json')) {
            resultText = resultText.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(resultText);
    }

static async proposeContractUpdates(text, updates) {
        if (!text || !updates) throw new Error('Contract text and proposed updates context are required');

        const prompt = `
            Act as an advocate lawyer of the Supreme Court with 15 years of experience in contract creation for large corporations.
            The user wants you to propose amendments to the following client contract based on their desired updates.
            
            Desired Updates / Instructions:
            """${updates}"""

            Original Contract Text:
            """${text.substring(0, 10000)}"""
            
            Return ONLY a valid JSON object strictly with the following keys:
            - "proposedChanges": Detailed explanation of what was changed and why it protects the company.
            - "updatedContractText": The full, legally sound revised contract text incorporating the updates.
        `;

        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAPI_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key is missing. Cannot propose contract updates.');
        }

        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        });

        let resultText = response.choices[0].message.content;
        if (resultText.startsWith('```json')) resultText = resultText.replace(/```json/g, '').replace(/```/g, '');

        return JSON.parse(resultText);
    }

static async createContractWithAI(company, instructions, clientId) {
        if (!instructions) throw new Error('Instructions are required');

        let clientContext = '';
        let clientObj = null;
        if (clientId) {
            const Account = prisma.client;
            const Contact = prisma.client;
            
            clientObj = await prisma.lead.findUnique({ where: { id: clientId } }) || await Account.findUnique({ where: { id: clientId } }) || await Contact.findUnique({ where: { id: clientId } });
            
            if (clientObj) {
                clientContext = `
                CRITICAL INSTRUCTION: You MUST incorporate the following explicit client details naturally into the generated contract. Do not use generic placeholders for these fields:
                Client Representative Name: ${clientObj.name || clientObj.leadName || ''}
                Client Company: ${clientObj.company || ''}
                Client Email: ${clientObj.email || ''}
                Client Phone: ${clientObj.phone || ''}
                `;
            }
        }

        const companyContext = `
        CRITICAL INSTRUCTION: You MUST incorporate the following details representing OUR COMPANY into the contract. We are the provider:
        Company Name: ${company?.companyName || '180workspace Master Entity'}
        Company Contact Email: ${company?.adminEmail || ''}
        Company Website: ${company?.website || ''}
        `;

        const prompt = `
            Act as an advocate lawyer of the Supreme Court with 15 years of experience in contract drafting.
            The user wants you to draft a new, formal, legally-sound contract from scratch based on their instructions.

            ${companyContext}
            
            ${clientContext}

            User's Custom Requirements:
            """${instructions}"""
            
            Return ONLY a valid JSON object strictly with the following keys. Do not include markdown formatting:
            - "contractTitle": A professional title for the document.
            - "contractText": The full, generated legal agreement spanning multiple paragraphs. Ensure you use the provided Company and Client data instead of brackets like [Client Name].
        `;

        if (!process.env.OPENAPI_KEY && !process.env.OPENAI_API_KEY) {
            return {
                contractTitle: "Custom Legal Agreement",
                contractText: `THIS AGREEMENT is made effective as of today.\n\nBETWEEN:\n${company?.companyName || 'Our Company'} AND ${clientObj?.name || 'The Client'}\n\nBased on your instructions: ${instructions}`
            };
        }

        const { Configuration, OpenAIApi } = require('openai');
        const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAPI_KEY });
        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo-16k",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        });

        let resultText = response.data.choices[0].message.content;
        if (resultText.startsWith('```json')) {
            resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(resultText);
    }

static async getClientObjForContract(clientId) {
        if (!clientId) return null;
        const Account = prisma.client;
        const Contact = prisma.client;
        return await prisma.lead.findUnique({ where: { id: clientId } }) || await Account.findUnique({ where: { id: clientId } }) || await Contact.findUnique({ where: { id: clientId } });
    }

static async emailContract(company, userId, userName, contractTitle, contractText, clientId, email) {
        if (!contractText || (!clientId && !email)) {
            throw new Error('Contract text and a recipient email or client selection is required.');
        }

        const Settings = prisma.settings;
        const settings = await Settings.findFirst();
        if (!settings || !settings.smtpHost) throw new Error('SMTP Settings are not configured.');

        let clientObj = null;
        let recipientEmail = email;

        if (clientId) {
            clientObj = await this.getClientObjForContract(clientId);
            if (clientObj && !recipientEmail) recipientEmail = clientObj.email;
        }

        if (!recipientEmail) throw new Error('No recipient email found.');

        
        const doc = new PDFDocument({ margin: 50 });
        
        let chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        pdfUtils.generateContractPDF(doc, { contractTitle, contractText }, company, clientObj);
        doc.end();

        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });

        
        const result = await emailService.sendGenericEmail(recipientEmail, 
            `${company?.companyName || '180workspace'} - ${contractTitle || 'Legal Agreement'}`,
            `Hello,\n\nPlease find the attached ${contractTitle || 'document'} prepared for you by ${company?.companyName || 'our team'}.\n\nBest regards,\n${userName}`,
            [
                {
                    filename: `${contractTitle ? contractTitle.replace(/\s+/g, '_') : 'Contract'}.pdf`,
                    content: pdfBuffer
                }
            ]
        );

        if (!result.success) throw new Error('Failed to send email');

        await prisma.salesActivity.create({ data: {
            type: 'email',
            relatedContact: clientObj?.id || null,
            notes: `Sent Contract: ${contractTitle} to ${recipientEmail}`,
            owner: userId
        } });

        return { message: 'Contract emailed successfully to ' + recipientEmail };
    }

static async getSalesChatContext() {
        const [pipelines, leads] = await Promise.all([
            prisma.deal.findMany({ where: { stage: { not: 'ClosedLost' } }, select: { title: true, value: true, stage: true, priorityScore: true } }),
            prisma.deal.findMany({ where: { status: { not: 'Disqualified' } }, select: { name: true, client: { select: { companyName: true } }, leadScore: true } })
        ]);
        return { pipelines, leads };
    }

}
