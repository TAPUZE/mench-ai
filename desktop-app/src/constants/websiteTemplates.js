// Website Templates for Mench AI
// These templates are used when users request website building

export const WEBSITE_TEMPLATES = {
    // Hebrew templates
    HALACHA_QA_HE: {
        name: "פוסק הלכה - שאלות ותשובות",
        description: "אתר לשאלות ותשובות הלכתיות עם מראה מקום",
        keywords: ["הלכה", "פוסק", "שאלות", "תשובות", "רב", "יהדות", "דת"],
        template: `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>פוסק הלכה - שאלות ותשובות</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            direction: rtl;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .main-content {
            padding: 30px;
        }

        .question-form {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            border: 2px solid #e9ecef;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #2c3e50;
        }

        input[type="text"], textarea, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }

        textarea {
            resize: vertical;
            min-height: 120px;
        }

        .submit-btn {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
        }

        .answer-section {
            background: #fff;
            border: 2px solid #3498db;
            border-radius: 10px;
            padding: 25px;
            margin-top: 20px;
            display: none;
        }

        .warning {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #ffeaa7;
        }

        @media (max-width: 600px) {
            .container { margin: 10px; }
            .header h1 { font-size: 2em; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>פוסק הלכה</h1>
            <p>שאלות ותשובות הלכתיות עם מראה מקום</p>
        </div>

        <div class="main-content">
            <div class="question-form">
                <h2>שאל את שאלתך ההלכתית</h2>
                
                <form id="halachicForm">
                    <div class="form-group">
                        <label for="category">תחום הלכתי:</label>
                        <select id="category" name="category">
                            <option value="">בחר תחום</option>
                            <option value="shabbat">שבת</option>
                            <option value="kashrut">כשרות</option>
                            <option value="tefila">תפילה</option>
                            <option value="chagim">חגים ומועדים</option>
                            <option value="family">משפחה וחינוך</option>
                            <option value="business">עסקים וכספים</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="question">השאלה שלך:</label>
                        <textarea id="question" name="question" placeholder="כתוב כאן את השאלה ההלכתית שלך בפירוט..."></textarea>
                    </div>

                    <button type="submit" class="submit-btn">קבל תשובה הלכתית</button>
                </form>
            </div>

            <div class="warning">
                <strong>הערה חשובה:</strong> תשובות האתר מיועדות להכוונה בלבד. לשאלות הלכתיות חשובות יש להתייעץ עם רב מוסמך.
            </div>
        </div>
    </div>

    <script>
        document.getElementById('halachicForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const question = document.getElementById('question').value;
            if (!question.trim()) {
                alert('אנא כתוב את השאלה שלך');
                return;
            }
            alert('שאלתך נשלחה בהצלחה. תשובה תגיע בקרוב.');
        });
    </script>
</body>
</html>`
    },

    // English templates
    BUSINESS_LANDING_EN: {
        name: "Professional Business Landing Page",
        description: "Modern business website with Orthodox Jewish values",
        keywords: ["business", "landing", "professional", "website", "company", "services"],
        template: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Business - Excellence with Values</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
        }

        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 100px 0;
            text-align: center;
        }

        .hero h1 {
            font-size: 3em;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .hero p {
            font-size: 1.2em;
            margin-bottom: 30px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .cta-button {
            background: #27ae60;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.2s;
        }

        .cta-button:hover {
            transform: translateY(-2px);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .services {
            padding: 80px 0;
            background: #f8f9fa;
        }

        .services h2 {
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 50px;
            color: #2c3e50;
        }

        .service-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .service-card {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s;
        }

        .service-card:hover {
            transform: translateY(-5px);
        }

        .service-card h3 {
            color: #3498db;
            margin-bottom: 15px;
            font-size: 1.5em;
        }

        .contact {
            padding: 80px 0;
            background: #2c3e50;
            color: white;
            text-align: center;
        }

        .contact h2 {
            font-size: 2.5em;
            margin-bottom: 30px;
        }

        .contact-form {
            max-width: 600px;
            margin: 0 auto;
        }

        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
        }

        .form-group textarea {
            resize: vertical;
            min-height: 120px;
        }

        @media (max-width: 768px) {
            .hero h1 { font-size: 2em; }
            .service-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <section class="hero">
        <div class="container">
            <h1>Excellence with Values</h1>
            <p>Professional services built on integrity, quality, and commitment to doing what's right. We believe that success comes from serving others with honesty and dedication.</p>
            <a href="#contact" class="cta-button">Get Started Today</a>
        </div>
    </section>

    <section class="services">
        <div class="container">
            <h2>Our Services</h2>
            <div class="service-grid">
                <div class="service-card">
                    <h3>Consulting</h3>
                    <p>Expert guidance with integrity and wisdom, helping you make the right decisions for your business and your values.</p>
                </div>
                <div class="service-card">
                    <h3>Solutions</h3>
                    <p>Innovative approaches that respect tradition while embracing progress, creating lasting value for all stakeholders.</p>
                </div>
                <div class="service-card">
                    <h3>Support</h3>
                    <p>Dedicated service that goes beyond expectations, because we believe in building relationships, not just transactions.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="contact" id="contact">
        <div class="container">
            <h2>Contact Us</h2>
            <div class="contact-form">
                <form id="contactForm">
                    <div class="form-group">
                        <label for="name">Name:</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="message">Message:</label>
                        <textarea id="message" name="message" required></textarea>
                    </div>
                    <button type="submit" class="cta-button">Send Message</button>
                </form>
            </div>
        </div>
    </section>

    <script>
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! We will respond with care and promptness.');
        });
    </script>
</body>
</html>`
    },

    // Portfolio template
    PORTFOLIO_EN: {
        name: "Professional Portfolio Website",
        description: "Clean portfolio showcasing work with professional values",
        keywords: ["portfolio", "showcase", "work", "professional", "projects", "skills"],
        template: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Portfolio</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
        }

        .nav {
            background: rgba(255,255,255,0.95);
            padding: 1rem 0;
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
            backdrop-filter: blur(10px);
        }

        .nav ul {
            list-style: none;
            display: flex;
            justify-content: center;
            gap: 2rem;
        }

        .nav a {
            text-decoration: none;
            color: #333;
            font-weight: 500;
            transition: color 0.3s;
        }

        .nav a:hover {
            color: #3498db;
        }

        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 150px 0 100px;
            text-align: center;
        }

        .hero h1 {
            font-size: 3em;
            margin-bottom: 20px;
        }

        .hero p {
            font-size: 1.2em;
            max-width: 600px;
            margin: 0 auto;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .section {
            padding: 80px 0;
        }

        .section h2 {
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 50px;
            color: #2c3e50;
        }

        .portfolio-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .portfolio-item {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }

        .portfolio-item:hover {
            transform: translateY(-5px);
        }

        .portfolio-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }

        .portfolio-content {
            padding: 20px;
        }

        .portfolio-content h3 {
            color: #3498db;
            margin-bottom: 10px;
        }

        .skills {
            background: #f8f9fa;
        }

        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }

        .skill-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }

        .skill-item h3 {
            color: #3498db;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .hero h1 { font-size: 2em; }
            .nav ul { flex-direction: column; align-items: center; gap: 1rem; }
        }
    </style>
</head>
<body>
    <nav class="nav">
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#portfolio">Portfolio</a></li>
            <li><a href="#skills">Skills</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>

    <section class="hero" id="home">
        <div class="container">
            <h1>Professional Portfolio</h1>
            <p>Dedicated to excellence, integrity, and creating meaningful work that makes a positive impact.</p>
        </div>
    </section>

    <section class="section" id="portfolio">
        <div class="container">
            <h2>My Work</h2>
            <div class="portfolio-grid">
                <div class="portfolio-item">
                    <div class="portfolio-content">
                        <h3>Project One</h3>
                        <p>Description of a meaningful project that demonstrates skill and values-based approach to work.</p>
                    </div>
                </div>
                <div class="portfolio-item">
                    <div class="portfolio-content">
                        <h3>Project Two</h3>
                        <p>Another example of work that showcases technical excellence and ethical approach.</p>
                    </div>
                </div>
                <div class="portfolio-item">
                    <div class="portfolio-content">
                        <h3>Project Three</h3>
                        <p>A project that demonstrates innovation while respecting traditional values.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section skills" id="skills">
        <div class="container">
            <h2>Skills & Expertise</h2>
            <div class="skills-grid">
                <div class="skill-item">
                    <h3>Technical Skills</h3>
                    <p>Proficiency in modern technologies combined with attention to detail and quality.</p>
                </div>
                <div class="skill-item">
                    <h3>Problem Solving</h3>
                    <p>Analytical thinking guided by wisdom and ethical considerations.</p>
                </div>
                <div class="skill-item">
                    <h3>Communication</h3>
                    <p>Clear, honest communication that builds trust and understanding.</p>
                </div>
            </div>
        </div>
    </section>

    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    </script>
</body>
</html>`
    }
};

// Function to select appropriate template based on user request
export const selectWebsiteTemplate = (userRequest, language = 'en') => {
    const requestLower = userRequest.toLowerCase();
    
    // Hebrew requests
    if (language === 'he' || /[א-ת]/.test(userRequest)) {
        if (requestLower.includes('הלכה') || requestLower.includes('פוסק') || 
            requestLower.includes('רב') || requestLower.includes('יהדות')) {
            return WEBSITE_TEMPLATES.HALACHA_QA_HE;
        }
    }
    
    // English requests
    if (requestLower.includes('business') || requestLower.includes('company') || 
        requestLower.includes('service') || requestLower.includes('landing')) {
        return WEBSITE_TEMPLATES.BUSINESS_LANDING_EN;
    }
    
    if (requestLower.includes('portfolio') || requestLower.includes('showcase') || 
        requestLower.includes('work') || requestLower.includes('project')) {
        return WEBSITE_TEMPLATES.PORTFOLIO_EN;
    }
    
    // Default to business template
    return WEBSITE_TEMPLATES.BUSINESS_LANDING_EN;
};

// Generate website instructions for the AI
export const generateWebsiteInstructions = (userRequest, template) => {
    return `You are building a website based on this request: "${userRequest}"

IMPORTANT: You must provide COMPLETE, WORKING HTML CODE that can be directly saved as an HTML file and opened in a browser.

Template selected: ${template.name}
Description: ${template.description}

INSTRUCTIONS:
1. Use the template as a starting point but customize it for the user's specific request
2. Include modern CSS styling with responsive design
3. Add appropriate JavaScript for interactivity
4. Ensure the content reflects Orthodox Jewish values of excellence, integrity, and service
5. Make it professional and visually appealing
6. Include proper HTML structure with DOCTYPE, meta tags, etc.
7. Use placeholder content that the user can easily customize
8. Ensure all code is complete and functional

The website should be ready to use immediately after being created.`;
};
