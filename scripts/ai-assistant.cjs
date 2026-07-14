#!/usr/bin/env node
/**
 * Elmoorx AI Assistant — Integrated AI helper for the Visual Builder
 *
 * Features:
 * - Natural language to UI: "Create a login form" → generates JSX
 * - Component suggestions based on context
 * - Code explanations
 * - Bug detection and fixes
 * - Performance optimization hints
 * - Accessibility checks
 * - Style improvements
 *
 * Uses pattern-matching + heuristics (no external AI API needed for demo).
 * In production, swap with real LLM API (OpenAI, Anthropic, Z.ai GLM).
 *
 * Runs on port 5400
 */

const http = require('http');
const crypto = require('crypto');

// ─── Pattern matching rules ─────────────────────────────────────────────────

const PATTERNS = [
  // Login / signup forms
  {
    match: /\b(login|sign in|log in|signin)\b/i,
    generate: () => ({
      type: 'form',
      title: 'Login Form',
      code: `<div className="min-h-screen flex items-center justify-center bg-gray-50">
  <div className="bg-white p-8 rounded-xl shadow-md w-96">
    <h2 className="text-2xl font-bold mb-6 text-center">Welcome Back</h2>
    <Input type="email" placeholder="Email" className="w-full mb-4" />
    <Input type="password" placeholder="Password" className="w-full mb-4" />
    <Button variant="primary" className="w-full">Sign In</Button>
    <p className="text-center mt-4 text-sm text-gray-600">
      Don't have an account? <Link href="/signup">Sign up</Link>
    </p>
  </div>
</div>`,
    }),
  },
  {
    match: /\b(signup|sign up|register|registration)\b/i,
    generate: () => ({
      type: 'form',
      title: 'Sign Up Form',
      code: `<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
  <Card className="w-96 p-8">
    <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
    <p className="text-center text-gray-600 mb-6">Start your free 14-day trial</p>
    <Input placeholder="Full Name" className="w-full mb-3" />
    <Input type="email" placeholder="Email" className="w-full mb-3" />
    <Input type="password" placeholder="Password (min 8 chars)" className="w-full mb-4" />
    <Button variant="primary" className="w-full">Create Account</Button>
    <p className="text-xs text-center mt-4 text-gray-500">
      By signing up, you agree to our <Link href="/terms">Terms</Link>
    </p>
  </Card>
</div>`,
    }),
  },
  // Dashboard
  {
    match: /\b(dashboard|admin|analytics)\b/i,
    generate: () => ({
      type: 'dashboard',
      title: 'Admin Dashboard',
      code: `<div className="grid grid-cols-[240px_1fr] min-h-screen">
  <Sidebar>
    <SidebarItem icon="📊" active>Dashboard</SidebarItem>
    <SidebarItem icon="👥">Users</SidebarItem>
    <SidebarItem icon="🏢">Workspaces</SidebarItem>
    <SidebarItem icon="💳">Billing</SidebarItem>
  </Sidebar>
  <main className="p-8">
    <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
    <div className="grid grid-cols-4 gap-4 mb-8">
      <Stat label="Users" value="1,234" trend="+12%" />
      <Stat label="Revenue" value="$12.4k" trend="+8%" />
      <Stat label="Active" value="892" trend="+5%" />
      <Stat label="Churn" value="2.1%" trend="-0.3%" />
    </div>
    <Card>
      <LineChart data={trafficData} />
    </Card>
  </main>
</div>`,
    }),
  },
  // Pricing
  {
    match: /\b(pricing|plans|subscription|tiers)\b/i,
    generate: () => ({
      type: 'pricing',
      title: 'Pricing Table',
      code: `<section className="py-20 bg-gray-50">
  <h2 className="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing</h2>
  <div className="grid grid-cols-3 gap-8 max-w-5xl mx-auto">
    <PricingCard
      name="Free"
      price="$0"
      features={["1 user", "1,000 API calls", "Community support"]}
      cta="Get Started"
    />
    <PricingCard
      name="Pro"
      price="$99"
      features={["25 users", "500K API calls", "Priority support", "Custom branding"]}
      highlighted
      cta="Start Free Trial"
    />
    <PricingCard
      name="Enterprise"
      price="$499"
      features={["500 users", "10M API calls", "Dedicated CSM", "SLA", "SSO"]}
      cta="Contact Sales"
    />
  </div>
</section>`,
    }),
  },
  // Hero section
  {
    match: /\b(hero|landing|homepage|front ?page)\b/i,
    generate: () => ({
      type: 'hero',
      title: 'Hero Section',
      code: `<section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-24 text-center">
  <div className="max-w-3xl mx-auto px-4">
    <Badge variant="outline" className="mb-4">🎉 Now in beta</Badge>
    <h1 className="text-5xl font-bold mb-6">Build Faster with Elmoorx</h1>
    <p className="text-xl opacity-90 mb-8">The framework that ships 4.2kb and runs anywhere.</p>
    <div className="flex gap-4 justify-center">
      <Button size="lg" variant="secondary">Get Started Free →</Button>
      <Button size="lg" variant="outline">View Demo</Button>
    </div>
  </div>
</section>`,
    }),
  },
  // Card grid
  {
    match: /\b(card|grid|gallery|showcase)\b/i,
    generate: () => ({
      type: 'grid',
      title: 'Card Grid',
      code: `<div className="grid grid-cols-3 gap-6 p-8">
  {[1, 2, 3, 4, 5, 6].map(i => (
    <Card key={i}>
      <CardHeader>
        <h3 className="font-semibold">Card Title {i}</h3>
      </CardHeader>
      <CardBody>
        <p className="text-gray-600">Card description goes here. Lorem ipsum dolor sit amet.</p>
      </CardBody>
      <CardFooter>
        <Button variant="ghost">Learn more →</Button>
      </CardFooter>
    </Card>
  ))}
</div>`,
    }),
  },
  // Table
  {
    match: /\b(table|data table|list|data grid)\b/i,
    generate: () => ({
      type: 'table',
      title: 'Data Table',
      code: `<Card>
  <CardHeader>
    <h3>Recent Users</h3>
  </CardHeader>
  <Table>
    <TableHeader>
      <TableRow>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Joined</th>
        <th>Status</th>
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.map(user => (
        <TableRow key={user.id}>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td><Badge>{user.role}</Badge></td>
          <td>{formatDate(user.joinedAt)}</td>
          <td><StatusBadge status={user.status} /></td>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Card>`,
    }),
  },
  // Navigation
  {
    match: /\b(navbar|navigation|header|menu bar|top bar)\b/i,
    generate: () => ({
      type: 'nav',
      title: 'Navbar',
      code: `<Navbar>
  <NavbarBrand>
    <Logo /> Elmoorx
  </NavbarBrand>
  <NavList>
    <NavItem><NavLink href="/" active>Home</NavLink></NavItem>
    <NavItem><NavLink href="/features">Features</NavLink></NavItem>
    <NavItem><NavLink href="/pricing">Pricing</NavLink></NavItem>
    <NavItem><NavLink href="/docs">Docs</NavLink></NavItem>
  </NavList>
  <NavbarActions>
    <Button variant="ghost">Sign In</Button>
    <Button variant="primary">Get Started</Button>
  </NavbarActions>
</Navbar>`,
    }),
  },
  // Footer
  {
    match: /\b(footer|bottom)\b/i,
    generate: () => ({
      type: 'footer',
      title: 'Footer',
      code: `<Footer className="bg-gray-900 text-gray-400 py-12">
  <div className="grid grid-cols-4 gap-8 max-w-6xl mx-auto">
    <div>
      <h4 className="text-white mb-4">Product</h4>
      <ul><li><Link>Features</Link></li><li><Link>Pricing</Link></li></ul>
    </div>
    <div>
      <h4 className="text-white mb-4">Company</h4>
      <ul><li><Link>About</Link></li><li><Link>Blog</Link></li></ul>
    </div>
    <div>
      <h4 className="text-white mb-4">Resources</h4>
      <ul><li><Link>Docs</Link></li><li><Link>API</Link></li></ul>
    </div>
    <div>
      <h4 className="text-white mb-4">Legal</h4>
      <ul><li><Link>Privacy</Link></li><li><Link>Terms</Link></li></ul>
    </div>
  </div>
  <div className="text-center mt-8 pt-8 border-t border-gray-800">
    © 2026 Elmoorx Framework. All rights reserved.
  </div>
</Footer>`,
    }),
  },
  // Form
  {
    match: /\b(form|contact|feedback|survey)\b/i,
    generate: () => ({
      type: 'form',
      title: 'Contact Form',
      code: `<Card className="max-w-md mx-auto p-6">
  <h2 className="text-xl font-bold mb-4">Contact Us</h2>
  <FormField label="Name">
    <Input placeholder="Your name" />
  </FormField>
  <FormField label="Email">
    <Input type="email" placeholder="you@example.com" />
  </FormField>
  <FormField label="Subject">
    <Select>
      <option>General inquiry</option>
      <option>Support</option>
      <option>Sales</option>
    </Select>
  </FormField>
  <FormField label="Message">
    <Textarea rows={4} placeholder="How can we help?" />
  </FormField>
  <Button variant="primary" className="w-full">Send Message</Button>
</Card>`,
    }),
  },
  // Chat
  {
    match: /\b(chat|messaging|messages|conversation)\b/i,
    generate: () => ({
      type: 'chat',
      title: 'Chat Interface',
      code: `<div className="flex flex-col h-screen max-w-2xl mx-auto">
  <Header>
    <Avatar src={user.avatar} />
    <div>
      <h3>Team Chat</h3>
      <p className="text-xs text-gray-500">12 members online</p>
    </div>
  </Header>
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {messages.map(msg => (
      <ChatMessage
        key={msg.id}
        avatar={msg.avatar}
        name={msg.name}
        text={msg.text}
        time={msg.time}
        own={msg.userId === currentUser.id}
      />
    ))}
  </div>
  <ChatInput onSend={handleSend} placeholder="Type a message..." />
</div>`,
    }),
  },
  // E-commerce
  {
    match: /\b(shop|store|product|ecommerce|e-commerce|cart)\b/i,
    generate: () => ({
      type: 'shop',
      title: 'Product Card',
      code: `<div className="grid grid-cols-3 gap-6">
  {products.map(product => (
    <Card key={product.id} className="overflow-hidden">
      <Image
        src={product.image}
        alt={product.name}
        ratio="square"
      />
      <CardBody>
        <h3 className="font-semibold">{product.name}</h3>
        <p className="text-gray-600">{product.description}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-xl font-bold">\${product.price}</span>
          <Button size="sm" variant="primary">Add to Cart</Button>
        </div>
      </CardBody>
    </Card>
  ))}
</div>`,
    }),
  },
  // Profile
  {
    match: /\b(profile|user profile|account)\b/i,
    generate: () => ({
      type: 'profile',
      title: 'Profile Card',
      code: `<Card className="max-w-sm mx-auto">
  <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500" />
  <div className="px-6 pb-6">
    <Avatar
      src={user.avatar}
      size="xl"
      className="-mt-12 border-4 border-white"
    />
    <h2 className="text-xl font-bold mt-2">{user.name}</h2>
    <p className="text-gray-600">{user.title}</p>
    <p className="text-sm text-gray-500 mt-2">{user.bio}</p>
    <div className="flex gap-2 mt-4">
      <Button variant="primary" size="sm">Follow</Button>
      <Button variant="outline" size="sm">Message</Button>
    </div>
    <div className="grid grid-cols-3 gap-4 mt-6 text-center">
      <div><div className="font-bold">{user.posts}</div><div className="text-xs text-gray-500">Posts</div></div>
      <div><div className="font-bold">{user.followers}</div><div className="text-xs text-gray-500">Followers</div></div>
      <div><div className="font-bold">{user.following}</div><div className="text-xs text-gray-500">Following</div></div>
    </div>
  </div>
</Card>`,
    }),
  },
  // 404 / error
  {
    match: /\b(404|error|not found|page not found)\b/i,
    generate: () => ({
      type: 'error',
      title: '404 Error Page',
      code: `<div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-center">
  <div>
    <h1 className="text-9xl font-bold text-indigo-500">404</h1>
    <h2 className="text-2xl mt-4">Page Not Found</h2>
    <p className="text-gray-400 mt-2 mb-8">The page you're looking for doesn't exist.</p>
    <Button variant="primary">← Back Home</Button>
  </div>
</div>`,
    }),
  },
];

// ─── Code analysis rules ────────────────────────────────────────────────────

function analyzeCode(code) {
  const issues = [];
  const suggestions = [];

  // Check for accessibility
  if (/<img[^>]+src=/.test(code) && !/alt=/.test(code)) {
    issues.push({ severity: 'warning', message: 'Images should have alt attributes for accessibility' });
  }
  if (/<button[^>]*>[^<]*<\/button>/i.test(code) && !/aria-label/.test(code)) {
    suggestions.push({ type: 'a11y', message: 'Consider adding aria-label to icon-only buttons' });
  }

  // Check for performance
  if (code.includes('useEffect') && !code.includes('[]')) {
    suggestions.push({ type: 'perf', message: 'Consider adding dependency array to useEffect to avoid infinite loops' });
  }
  if ((code.match(/<div/g) || []).length > 10) {
    suggestions.push({ type: 'perf', message: 'Consider extracting repeated divs into a component' });
  }

  // Check for security
  if (code.includes('dangerouslySetInnerHTML')) {
    issues.push({ severity: 'critical', message: 'Avoid dangerouslySetInnerHTML — Elmoorx auto-sanitizes by default' });
  }
  if (/eval\(/.test(code)) {
    issues.push({ severity: 'critical', message: 'Avoid eval() — security risk' });
  }

  // Check for best practices
  if (code.includes('useState(0)') && code.includes('count')) {
    suggestions.push({ type: 'modern', message: 'Use $state() instead of useState() for Elmoorx signals' });
  }
  if (code.includes('className=')) {
    suggestions.push({ type: 'modern', message: 'In Elmoorx, you can use class= instead of className=' });
  }

  // Component count
  const componentCount = (code.match(/<[A-Z]\w+/g) || []).length;
  if (componentCount > 0) {
    suggestions.push({ type: 'info', message: `Found ${componentCount} component(s) in the code` });
  }

  return { issues, suggestions };
}

// ─── Chat response generator ───────────────────────────────────────────────

function generateResponse(userInput) {
  const input = userInput.toLowerCase().trim();

  // Check for help
  if (/^(help|what can you do|commands)/.test(input)) {
    return {
      type: 'text',
      text: `I can help you build UI components! Try asking me:

🎨 **Generate UI**: "Create a login form", "Build a dashboard", "Make a pricing table"
🔍 **Analyze code**: Paste code and I'll check for issues
💡 **Suggest improvements**: I'll recommend better patterns
♿ **Accessibility checks**: I'll spot a11y issues
⚡ **Performance tips**: I'll suggest optimizations

Examples:
- "Create a hero section for a SaaS landing page"
- "Build a chat interface"
- "Make a product card for an e-commerce site"
- "Generate a 404 error page"`,
    };
  }

  // Try each pattern
  for (const pattern of PATTERNS) {
    if (pattern.match.test(input)) {
      const result = pattern.generate();
      return {
        type: 'code',
        text: `Here's a ${result.title} based on your request:`,
        title: result.title,
        code: result.code,
        actions: [
          { label: '📋 Copy', action: 'copy' },
          { label: '🎨 Open in Builder', action: 'open-builder' },
          { label: '👁 Preview', action: 'preview' },
        ],
      };
    }
  }

  // Code analysis (if user pasted code)
  if (input.includes('<') && input.includes('/>')) {
    const analysis = analyzeCode(userInput);
    let text = `I analyzed your code. Here's what I found:\n\n`;
    if (analysis.issues.length === 0 && analysis.suggestions.length === 0) {
      text += `✅ Your code looks great! No issues found.`;
    } else {
      if (analysis.issues.length > 0) {
        text += `**Issues (${analysis.issues.length}):**\n`;
        analysis.issues.forEach(i => text += `${i.severity === 'critical' ? '🚨' : '⚠️'} ${i.message}\n`);
      }
      if (analysis.suggestions.length > 0) {
        text += `\n**Suggestions (${analysis.suggestions.length}):**\n`;
        analysis.suggestions.forEach(s => text += `💡 ${s.message}\n`);
      }
    }
    return { type: 'analysis', text };
  }

  // Fallback
  return {
    type: 'text',
    text: `I'm not sure how to help with that. Try asking me to:

- "Create a login form"
- "Build a dashboard"
- "Make a pricing table"  
- "Generate a hero section"
- "Build a chat interface"

Or type "help" to see all options.`,
  };
}

// ─── HTML UI ────────────────────────────────────────────────────────────────

function generateAIHTML() {
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Elmoorx AI Assistant</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #e2e8f0; height: 100vh; display: flex; flex-direction: column; }
  header { padding: 16px 24px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 18px; color: #818cf8; }
  header .status { background: #10b981; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
  .chat { flex: 1; overflow-y: auto; padding: 24px; }
  .message { margin-bottom: 16px; max-width: 80%; }
  .message.user { margin-left: auto; }
  .message .bubble { padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
  .message.user .bubble { background: #4f46e5; color: white; }
  .message.ai .bubble { background: #1e293b; border: 1px solid #334155; }
  .message.ai .bubble pre { background: #0f172a; padding: 12px; border-radius: 6px; margin-top: 8px; overflow-x: auto; font-family: 'SF Mono', monospace; font-size: 12px; color: #10b981; }
  .message .actions { margin-top: 8px; display: flex; gap: 6px; }
  .message .actions button { background: #334155; color: #94a3b8; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .message .actions button:hover { background: #475569; color: white; }
  .input-area { padding: 16px 24px; background: #1e293b; border-top: 1px solid #334155; }
  .input-area form { display: flex; gap: 8px; }
  .input-area input { flex: 1; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-family: inherit; }
  .input-area input:focus { outline: none; border-color: #6366f1; }
  .input-area button { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500; }
  .suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .suggestion { background: #334155; color: #94a3b8; padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; }
  .suggestion:hover { background: #475569; color: white; }
</style>
</head>
<body>

<header>
  <h1>🤖 Elmoorx AI Assistant</h1>
  <span class="status">ONLINE</span>
  <span style="color:#64748b;font-size:12px;margin-left:auto;">Powered by Elmoorx AI v2.0</span>
</header>

<div class="chat" id="chat">
  <div class="message ai">
    <div class="bubble">
      👋 Hi! I'm your AI assistant. I can generate UI components, analyze code, and suggest improvements.
      <br><br>
      Try asking me to create something:
      <div class="suggestions">
        <span class="suggestion" onclick="send('Create a login form')">Create a login form</span>
        <span class="suggestion" onclick="send('Build a dashboard')">Build a dashboard</span>
        <span class="suggestion" onclick="send('Make a pricing table')">Make a pricing table</span>
        <span class="suggestion" onclick="send('Generate a hero section')">Generate a hero section</span>
        <span class="suggestion" onclick="send('Build a chat interface')">Build a chat interface</span>
      </div>
    </div>
  </div>
</div>

<div class="input-area">
  <form onsubmit="handleSubmit(event)">
    <input type="text" id="input" placeholder="Ask me to build something..." autocomplete="off">
    <button type="submit">Send →</button>
  </form>
</div>

<script>
function addMessage(text, isUser, extra) {
  const chat = document.getElementById('chat');
  const msg = document.createElement('div');
  msg.className = 'message ' + (isUser ? 'user' : 'ai');
  let html = '<div class="bubble">' + escapeHtml(text);
  if (extra?.code) {
    html += '<pre>' + escapeHtml(extra.code) + '</pre>';
  }
  if (extra?.actions) {
    html += '<div class="actions">';
    extra.actions.forEach(a => {
      html += '<button onclick="handleAction(\\'' + a.action + '\\\\', \\\'' + (extra.code || '').replace(/'/g, '\\\\\\'') + '\\\\')">' + a.label + '</button>';
    });
    html += '</div>';
  }
  html += '</div>';
  msg.innerHTML = html;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function send(text) {
  document.getElementById('input').value = text;
  handleSubmit({ preventDefault: () => {} });
}

function handleSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('input');
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, true);
  input.value = '';

  // Call API
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  })
  .then(r => r.json())
  .then(data => {
    addMessage(data.text, false, data);
  })
  .catch(err => {
    addMessage('Sorry, something went wrong: ' + err.message, false);
  });
}

function handleAction(action, code) {
  if (action === 'copy') {
    navigator.clipboard.writeText(code);
    alert('Code copied!');
  } else if (action === 'open-builder') {
    window.open('http://127.0.0.1:5100', '_blank');
  } else if (action === 'preview') {
    const w = window.open('', '_blank');
    w.document.write(code);
    w.document.close();
  }
}
</script>
</body>
</html>`;
}

// ─── HTTP server ───────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(generateAIHTML());
  }

  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { message } = JSON.parse(body);
        const response = generateResponse(message);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(response));
      } catch (err) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url.startsWith('/api/generate/')) {
    const prompt = decodeURIComponent(req.url.split('/').pop());
    const response = generateResponse(prompt);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(response));
  }

  if (req.url === '/api/analyze' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { code } = JSON.parse(body);
        const analysis = analyzeCode(code);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(analysis));
      } catch (err) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/patterns') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      total: PATTERNS.length,
      patterns: PATTERNS.map((p, i) => ({
        id: i,
        match: p.match.toString(),
      })),
    }));
  }

  if (req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'ok', service: 'ai-assistant', version: '2.0.0-alpha.23',
      patternsCount: PATTERNS.length,
      capabilities: ['ui-generation', 'code-analysis', 'accessibility-checks', 'performance-tips'],
    }));
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = 5400;
server.listen(PORT, () => {
  console.log(`  ✓ AI Assistant        → http://localhost:${PORT} (${PATTERNS.length} patterns)`);
});

module.exports = { server, PATTERNS, generateResponse, analyzeCode };
