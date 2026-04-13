// // agent
// For MVP, deepseek will be replaced later on wiht our own


const express = require('express');         // handle HTTP requests
const OpenAI = require('openai');           // universal API client, (Ollama, OpenAI, deepseek)
const multer = require('multer');           // handles form data, need it to save file to uploads folder
const PDFParser = require('pdf2json');      // extract text from pdf
const mammoth = require('mammoth');         // extract text from .docx files
const fs = require('fs');                   // read, write, delete files
const path = require('path');               // handle file paths

const app = express();
app.use(express.json());                    // parses json text format, node.js cannot read json format 
app.use(express.static('.'));               // '.' root folder, so browser can load the files in the folder

// Deep seek uses the same API format as OpenAI
const client = new OpenAI({
    // apiKey: 'ollama',
    // baseURL: 'http://localhost:11434/v1'

    // (set DEEPSEEK_API_KEY='api key') and (node server.js) on cmd
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
});

// Store uploaded file texts in memory
// resets when server restarts as it is stored in server memory
const uploadedDocs = {};

// Auto-create uploads folder if it doesn't exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Multer saves files to an 'uploads' folder
// After text extraction, the file is deleted (fs.unlinkSync)
const upload = multer({ dest: 'uploads/' });

// ── POST /upload ──────────────────────────────────────
// called by script.js addFiles() when user uploads file
// recieves file, extract its text based on its file type, stores in uploadedDocs and can delete the file
// the extracted text is later sent to AI system prompt (/chat)
app.post('/upload', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;                             // path that multer saved the file
    const originalName = req.file.originalname;                 // original name of file to show in UI as list of uploads
    const ext = path.extname(originalName).toLowerCase();       // .pdf, .docx, .txt

    try {
        let text = '';

        // extract text from pdf file
        if (ext === '.pdf') {
            // pdf2json parses the PDF by structure and extracts its text by page
            // pdf2json is event based, not async, so using Promise to await the result
            text = await new Promise((resolve, reject) => {
                const parser = new PDFParser();
                parser.on('pdfParser_dataReady', (data) => {
                    const pages = data.Pages || [];
                    const extracted = pages.map(page =>
                        page.Texts.map(t => decodeURIComponent(t.R.map(r => r.T).join(''))).join(' ')
                    ).join('\n');
                    resolve(extracted || `[File "${originalName}" has no extractable text]`);
                });
                parser.on('pdfParser_dataError', reject);
                parser.loadPDF(filePath);
            }); 
        } else if (ext === '.docx') {       
            // word file is extracted by mammoth
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
        } else if (ext === '.txt') {        
            // plain txt file can be read directly
            text = fs.readFileSync(filePath, 'utf8');
        } else {
            // unsupported file types are shown as follows to the agent, so that it can know if a file was uploaded
            // only the file name will be known to the agent
            text = `[File "${originalName}" is not a supported type for text extraction — .pdf, .docx, .txt only]`;
        }

        uploadedDocs[originalName] = text;      // store extracted text, keyed by file name
        fs.unlinkSync(filePath);                // clean up temp file
        res.json({ success: true, name: originalName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Could not extract text from file.' });
    }
});

// ── Chat endpoint ─────────────────────────────────────────────
// called by script.js ask() on every user message input
// agent recieves conversation history and list of user selected document names
// prompt to agent about answer in Australian context + selected document text
app.post('/chat', async (req, res) => {
    // messages -> full conversation history, sent to deepseek everytime
    // selectedDocs -> list of user selected file names, only these are sent as context
    const { messages, selectedDocs } = req.body;

    // Use only checked documents, or all if none specified
    // If no docsToUse is empty, agent will use its own knowledge only
    const docsToUse = selectedDocs && selectedDocs.length > 0
        ? Object.entries(uploadedDocs).filter(([name]) => selectedDocs.includes(name))
        : [];

    // combine selected file texts into one string, labeled by file name
    const docContext = docsToUse
        .map(([name, text]) => `--- ${name} ---\n${text}`)
        .join('\n\n');

    // Prepend document context as a system message if any docs are uploaded
    const systemPrompt = `Your name is RISHI, and you must speak in simple and concise language anyone can understand.
    Don't use legal jargon. If you must use legal terms, explain them in simple language.
    Try to keep your answer as concise as possible, ideally under 200 words. If the question is ambiguous, ask for clarification instead of making assumptions.
    If you are making assumption, you should tell upfront.
    You are a helpful assistant operating exclusively under Australian law and jurisdiction. 
Unless the user explicitly mentions another country, always assume all questions, scenarios, and contexts are based in Australia.
Apply Australian legislation, regulations, and legal standards in all responses.
If a question involves law, compliance, contracts, employment, tax, or any legal matter, refer only to Australian law (e.g. the Corporations Act 2001, Fair Work Act 2009, Australian Consumer Law, etc.).
If the user explicitly asks about another jurisdiction, you may answer for that jurisdiction but remind them you are optimised for Australian law.
${docContext ? `\nAnswer questions based on the following uploaded documents:\n\n${docContext}` : ''}`;

    // add systemPrompt to conversation history before sending it to deepseek
    const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    try {
        const response = await client.chat.completions.create({
            model: 'deepseek-chat',
            // model: 'llama3.2',
            // model: 'deepseek-r1:1.5b', // 2GB RAM, slower and less accurate than llama3.2, likely due to my laptop
            // model: 'deepseek-r1:7b', // 5GB RAM, slower and less accurate 
            // model: 'deepseek-r1:14b', // 10GB RAM, not suitable for local testing.
            messages: fullMessages
        });
        res.json({ reply: response.choices[0].message.content });
    } catch (err) {
        console.error(err);
        res.status(500).json({ reply: 'Server error.' });
    }
});

// ── Clear docs on new conversation ────────────────────────────
// called by createNewConversation(), wipe out all in uploadedDocs
app.post('/clear', (req, res) => {
    Object.keys(uploadedDocs).forEach(k => delete uploadedDocs[k]);
    res.json({ success: true });
});

// start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));