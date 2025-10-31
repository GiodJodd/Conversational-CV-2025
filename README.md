# Conversational CV (Framer + Vercel)

An AI-powered chat interface that tells potential recruiters about you. Built with Framer for the frontend and deployed on Vercel as an Edge function.

**Features:**
- Multi-turn conversation history
- Token-by-token streaming for better UX
- Low-code setup (no frameworks required)
- Secure API key management on the backend

## Tech Stack

- **Backend**: Vercel Edge Function with [Vercel AI SDK](https://sdk.vercel.ai/docs) and `gpt-5-nano`
- **Frontend**: HTML/CSS/JS embed in Framer
- **Deployment**: Vercel (automatic from Git)

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
npm install
```

### 2. Configure Your Bio

Edit `api/chat/route.ts` and customize the `SYSTEM_PROMPT` with your details:
- Name and titles/roles
- Professional summary
- Skills and technologies
- Notable projects and links
- Location and availability
- Contact preferences

### 3. Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variable: `OPENAI_API_KEY` = your OpenAI API key
4. Deploy

Your API will be available at: `https://your-project.vercel.app/api/chat`

### 4. Add to Framer

In your Framer site, add an **Embed** component and paste the code below.

## Framer Embed (paste into an Embed)

```html
<div style="max-width:680px;margin:0 auto;font-family:system-ui;">
  <h3 style="margin:0 0 12px;">Talk to Giordano</h3>
  <div id="chat" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;"></div>
  <form id="form" style="display:flex;gap:8px;">
    <input id="q" type="text" placeholder="Ask about experience, projects, skills"
      style="flex:1;padding:10px;border:1px solid #ccc;border-radius:6px;" />
    <button type="submit" style="padding:10px 14px;border:none;border-radius:6px;background:#111;color:#fff;">Send</button>
  </form>
</div>
<script>
  const ENDPOINT = 'https://251030-ai-cv-dvwk.vercel.app/api/chat';
  const form = document.getElementById('form');
  const input = document.getElementById('q');
  const chat = document.getElementById('chat');
  const messages = [];

  function addBubble(text, role) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.whiteSpace = 'pre-wrap';
    div.style.padding = '10px';
    div.style.border = '1px solid #ddd';
    div.style.borderRadius = '8px';
    div.style.background = role === 'user' ? '#f4f4f4' : '#ffffff';
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = (input.value || '').trim();
    if (!question) return;

    messages.push({ role: 'user', content: question });
    addBubble(question, 'user');
    const assistantDiv = addBubble('...', 'assistant');

    form.querySelector('button').disabled = true;
    input.value = '';

    try {
      const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      if (!resp.ok || !resp.body) {
        assistantDiv.textContent = 'Sorry, something went wrong.';
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              assistantText += JSON.parse(line.slice(2));
            } catch (e) {}
          } else if (line.startsWith('e:') || line.startsWith('d:')) {
            // Control messages, ignore
          }
        }
        assistantDiv.textContent = assistantText;
        chat.scrollTop = chat.scrollHeight;
      }
      messages.push({ role: 'assistant', content: assistantText });
    } catch (err) {
      assistantDiv.textContent = 'Network error. Please try again.';
    } finally {
      form.querySelector('button').disabled = false;
    }
  });
</script>
```

**Important**: Replace `ENDPOINT = 'https://<your-domain>/api/chat'` with your actual Vercel deployment URL.

## How It Works

1. **Conversation State**: The Framer embed maintains conversation history in browser memory (`messages` array)
2. **Streaming**: Each user message is sent to the Vercel API, which streams tokens back using OpenAI's streaming API
3. **Security**: API keys never leave the server; all processing happens on Vercel's Edge network

## Project Structure

```
251030_ai-cv/
├── api/
│   └── chat/
│       └── route.ts     # Vercel serverless function with AI logic
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── README.md           # This file
```

## Customization

- **Model**: Change `gpt-4o-mini` to `gpt-4`, `gpt-4-turbo`, etc. in `api/chat/route.ts`
- **Temperature**: Adjust `temperature: 0.5` for more/less creative responses
- **History**: Modify `.slice(-10)` to keep more/fewer messages
- **Styling**: Update the inline CSS in the Framer embed

## Cost Estimate

Using `gpt-5-nano` with typical recruiter questions:
- ~$0.001-0.005 per conversation
- Roughly 400-2000 conversations per dollar

## Troubleshooting

**Chat shows "Network error"**
- Check that your Vercel deployment URL is correct
- Verify `OPENAI_API_KEY` is set in Vercel environment variables
- Check browser console for CORS errors

**Responses are off-topic**
- Customize the `SYSTEM_PROMPT` with more specific guardrails
- Add examples of good vs bad responses

**Streaming is slow**
- Ensure you're using Edge runtime (`runtime: 'edge'`)
- Check Vercel deployment region matches your users' location

## License

MIT
