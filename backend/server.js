const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;

const knowledgeBase = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'knowledgeBase.json'))
);

const interactionLog = [];

function mockRespond(message) {
  const text = message.toLowerCase();

  const rules = [
    { keywords: ['refund', 'money back', 'return'], category: 'refund',
      answer: "I can help with refunds. Once a return is received, refunds are typically processed within 5-7 business days back to your original payment method." },
    { keywords: ['deliver', 'shipping', 'shipment', 'order status', 'where is my order'], category: 'delivery',
      answer: "Your order status and estimated delivery date can be checked in your account under 'My Orders'. Standard delivery usually takes 3-5 business days." },
    { keywords: ['payment', 'charge', 'card declined', 'billing'], category: 'payment',
      answer: "For payment issues, please double-check your card details and try again. If a charge failed but funds were deducted, it should auto-reverse within 3-5 business days." },
    { keywords: ['complain', 'terrible', 'angry', 'worst', 'unacceptable'], category: 'complaint',
      answer: "I'm sorry to hear about your experience. I've logged your complaint and it will be reviewed by our team as a priority." },
    { keywords: ['product', 'item', 'quality', 'broken', 'damaged'], category: 'product',
      answer: "I'm sorry your product isn't meeting expectations. If it arrived damaged or faulty, we can arrange a replacement or refund." },
  ];

  const matched = rules.find(rule => rule.keywords.some(k => text.includes(k)));
  const negativeWords = ['angry', 'terrible', 'worst', 'unacceptable', 'furious', 'disappointed'];
  const sentiment = negativeWords.some(w => text.includes(w)) ? 'negative' : 'neutral';

  if (matched) {
    return {
      answer: matched.answer,
      category: matched.category,
      urgency: sentiment === 'negative' ? 'high' : 'low',
      sentiment,
      confident: true
    };
  }

  return {
    answer: "I'm not fully sure about that one — let me connect you with a human agent who can help further.",
    category: 'general',
    urgency: 'medium',
    sentiment,
    confident: false
  };
}

app.post('/api/chat', (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A "message" string is required.' });
  }

  const parsed = mockRespond(message);
  const escalated = parsed.urgency === 'high' || parsed.confident === false;

  const logEntry = {
    timestamp: new Date().toISOString(),
    customerMessage: message,
    answer: parsed.answer,
    category: parsed.category,
    urgency: parsed.urgency,
    sentiment: parsed.sentiment,
    escalated
  };
  interactionLog.push(logEntry);

  res.json({ ...parsed, escalated });
});

app.get('/api/log', (req, res) => {
  res.json(interactionLog);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});