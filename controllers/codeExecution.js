import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();


export const runCode = async (req, res) => {
  const { language, code, input } = req.body;

  console.log("language", language);
  console.log("code", code);
  console.log("input", input);
  if (!language || !code) {
    return res.status(400).json({ success: false, message: 'Language and code are required.' });
  }

  // Map your frontend language values to Judge0 language IDs
  const LANGUAGE_MAP = {
    c: 50,
    cpp: 54,
    java: 62,
    python: 71,
    javascript: 63,
  };

  const languageId = LANGUAGE_MAP[language];
  if (!languageId) {
    return res.status(400).json({ success: false, message: `Unsupported language: ${language}` });
  }

  try {
    // Submit code to Judge0
    const submissionRes = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
      {
        source_code: code,
        language_id: languageId,
        stdin: input || '',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, // Set this in your .env file
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
      }
    );

    const { stdout, stderr, compile_output, status } = submissionRes.data;
    console.log("submissionRes", submissionRes);

    return res.status(200).json({
      success: true,
      output: stdout || '',
      error: stderr || compile_output || '',
      status: status.description,
    });
  } catch (error) {
    console.error('Judge0 API error:', error?.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Code execution failed via Judge0 API.' });
  }
};
