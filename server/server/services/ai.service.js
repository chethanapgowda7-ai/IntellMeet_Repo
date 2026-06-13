const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate meeting summary and action items from transcript
const generateMeetingSummary = async (transcript, meetingTitle) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert meeting analyst. Your job is to analyze meeting transcripts and extract:
1. A concise summary (3-5 sentences)
2. Key discussion points (bullet points)
3. Action items with assigned people (if mentioned) and due dates (if mentioned)

Always respond in this exact JSON format:
{
  "summary": "Brief summary here...",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": [
    {
      "text": "Action item description",
      "assignedTo": "Person name or null",
      "dueDate": "Due date or null"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Meeting Title: ${meetingTitle}\n\nTranscript:\n${transcript}\n\nPlease analyze this meeting and provide the summary, key points, and action items.`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('AI summary error:', error);
    return {
      summary: 'Summary could not be generated automatically.',
      keyPoints: [],
      actionItems: [],
    };
  }
};

// Transcribe audio using OpenAI Whisper
const transcribeAudio = async (audioBuffer, fileName) => {
  try {
    const { Readable } = require('stream');
    const readable = Readable.from(audioBuffer);
    readable.path = fileName;

    const response = await openai.audio.transcriptions.create({
      file: readable,
      model: 'whisper-1',
      language: 'en',
    });

    return response.text;
  } catch (error) {
    console.error('Transcription error:', error);
    return '';
  }
};

module.exports = { generateMeetingSummary, transcribeAudio };