// This file is updated to handle file uploads by sending them to the Python backend server.

let isPaid = false; // Flag to simulate payment status
let lastScanResult = null; // Store the last scan result for displaying detailed feedback
let uploadedResumeContent = ''; // Stores content from uploaded file

const MAX_FREE_SCANS_FOR_DETAILS = 5; // Threshold for monthly usage warning
// This URL will be replaced with the public URL from your Heroku backend.
// Example: const BACKEND_URL = 'https://your-app-name.herokuapp.com/upload_resume';
const BACKEND_URL = 'YOUR_HEROKU_APP_URL_HERE/upload_resume';

// Event Listener for file input
document.addEventListener('DOMContentLoaded', () => {
    const resumeUploadInput = document.getElementById('resumeUpload');
    if (resumeUploadInput) {
        resumeUploadInput.addEventListener('change', handleFileUpload);
    }
});

/**
 * Shows a loading indicator while the backend processes the file.
 * @param {boolean} show Whether to show or hide the loading indicator.
 */
function showLoadingIndicator(show) {
    const uploadStatusElement = document.getElementById('uploadStatus');
    if (show) {
        uploadStatusElement.textContent = 'Processing file, please wait...';
        uploadStatusElement.classList.remove('hidden', 'text-green-600', 'text-red-600', 'text-orange-600');
        uploadStatusElement.classList.add('text-gray-600');
    } else {
        uploadStatusElement.classList.add('hidden');
    }
}

/**
 * Handles the file upload event, sending the file to the backend for parsing.
 * @param {Event} event The file input change event.
 */
async function handleFileUpload(event) {
    const file = event.target.files[0];
    const uploadStatusElement = document.getElementById('uploadStatus');
    const resumeContentTextarea = document.getElementById('resumeContent');

    if (!file) {
        uploadedResumeContent = '';
        resumeContentTextarea.value = '';
        uploadStatusElement.classList.add('hidden');
        return;
    }

    showLoadingIndicator(true);

    const formData = new FormData();
    formData.append('resumeFile', file);

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            uploadedResumeContent = result.text_content;
            resumeContentTextarea.value = uploadedResumeContent;
            uploadStatusElement.textContent = `File "${file.name}" loaded successfully.`;
            uploadStatusElement.classList.remove('text-gray-600');
            uploadStatusElement.classList.add('text-green-600');
            console.log(`Uploaded file content loaded. Length: ${uploadedResumeContent.length}`);
        } else {
            uploadedResumeContent = '';
            resumeContentTextarea.value = '';
            uploadStatusElement.textContent = `Error: ${result.error || 'An unknown error occurred.'}`;
            uploadStatusElement.classList.remove('text-gray-600');
            uploadStatusElement.classList.add('text-red-600');
            console.error(`Error from backend: ${result.error}`);
        }
    } catch (error) {
        console.error('Network or server error:', error);
        uploadedResumeContent = '';
        resumeContentTextarea.value = '';
        uploadStatusElement.textContent = `Network error: Could not connect to the server. Is the backend running?`;
        uploadStatusElement.classList.remove('text-gray-600');
        uploadStatusElement.classList.add('text-red-600');
    } finally {
        showLoadingIndicator(false);
    }
}

/**
 * Simulates a redirect to Stripe and then prompts the user to confirm payment.
 */
function simulatePaymentRedirect() {
    // Show message for user to complete payment on Stripe
    document.getElementById('paymentReturnMessage').classList.remove('hidden');
    document.getElementById('confirmPaymentReturnBtn').classList.remove('hidden');
}

/**
 * Confirms simulated payment and unlocks detailed report.
 */
function confirmSimulatedPayment() {
    isPaid = true;
    hidePaymentOptions(); // Hide the payment modal
    if (lastScanResult) {
        displayDetailedFeedback(lastScanResult);
        updateMonthlyUsage(); // Increment usage counter after a paid scan
    }
    document.getElementById('paymentReturnMessage').classList.add('hidden');
    document.getElementById('confirmPaymentReturnBtn').classList.add('hidden');
}


/**
 * Shows the payment options modal.
 */
function showPaymentOptions() {
    document.getElementById('paymentOverlay').classList.remove('hidden');
}

/**
 * Hides the payment options modal.
 */
function hidePaymentOptions() {
    document.getElementById('paymentOverlay').classList.add('hidden');
}

/**
 * Analyzes the resume and job description for ATS compatibility based on multiple criteria.
 * @param {string} resumeText The raw text content of the resume.
 * @param {string} jobText The raw text content of the job description.
 * @returns {object} An object containing the result ("PASS" or "FAIL"), overall ATS score, and detailed feedback.
 */
function analyzeATS(resumeText, jobText) {
    console.log("Starting ATS analysis with enhanced checks...");

    const resumeLower = resumeText.toLowerCase();
    const jobLower = jobText.toLowerCase();

    const scores = {
        keywordAlignment: 0,
        jobTitleMatch: 0,
        sectionLabeling: 0, // Score based on standard headers and absence of creative ones
        locationEligibility: 0,
        formattingReadability: 0 // Score based on dense text, emojis, problematic symbols
    };
    let feedback = [];

    // --- 1. Keyword Alignment ---
    const resumeWords = resumeLower.split(/\s+/).filter(word => word.length > 1);
    const jobWords = jobLower.split(/\s+/).filter(word => word.length > 1);

    let matchCount = 0;
    const matchedKeywords = new Set();
    const commonJobKeywords = new Set();

    jobWords.forEach(word => {
        if (resumeWords.includes(word)) {
            matchCount++;
            matchedKeywords.add(word);
        }
        if (word.length > 2) {
            commonJobKeywords.add(word);
        }
    });

    const keywordMatchPercentage = (jobWords.length > 0) ? (matchCount / jobWords.length) * 100 : 0;
    scores.keywordAlignment = keywordMatchPercentage;
    feedback.push(`<h3><strong>1. Keyword Alignment:</strong></h3>`);
    feedback.push(`<p>Your resume matched approximately <strong>${keywordMatchPercentage.toFixed(2)}%</strong> of the keywords in the job description.</p>`);
    if (keywordMatchPercentage < 30) {
        feedback.push('<p class="text-red-600"><strong>Action Needed:</strong> Your overall keyword match is low. Review the job description and integrate more relevant terms naturally into your resume.</p>');
    } else if (keywordMatchPercentage >= 30 && keywordMatchPercentage < 70) {
        feedback.push('<p class="text-orange-600"><strong>Good Start:</strong> Your keyword match is decent, but there\'s room for improvement.</p>');
    } else {
        feedback.push('<p class="text-green-600"><strong>Excellent:</strong> Your keyword match is strong for ATS!</p>');
    }
    const uniqueJobKeywords = Array.from(commonJobKeywords);
    const topMissingKeywords = uniqueJobKeywords.filter(word => !matchedKeywords.has(word)).slice(0, 5);
    if (topMissingKeywords.length > 0) {
        feedback.push(`<p><strong>Missing Keywords:</strong> Consider adding these relevant terms: ${topMissingKeywords.map(k => `<em>${k}</em>`).join(', ')}.</p>`);
    }
    feedback.push('<hr class="my-4 border-gray-300">');


    // --- 2. Job Title and Role Context ---
    feedback.push(`<h3><strong>2. Job Title and Role Context:</strong></h3>`);
    const jobTitleRegex = /job title:\s*(.*?)(?:\n|$)/i;
    const jobTitleMatchResult = jobTitleRegex.exec(jobText);
    let jobTitle = jobTitleMatchResult && jobTitleMatchResult[1] ? jobTitleMatchResult[1].trim().toLowerCase() : '';

    let isJobTitlePresent = false;
    if (jobTitle) {
        const titleVariants = [
            jobTitle,
            jobTitle.replace(/specialist/g, 'manager').replace(/manager/g, 'specialist'),
            jobTitle.replace(/digital\s*/, ''),
            jobTitle.replace(/\s*digital/, ''),
            jobTitle.replace(/analyst/g, 'specialist').replace(/specialist/g, 'analyst'),
            jobTitle.replace(/senior\s*/, ''),
            jobTitle.replace(/\s*senior/, '')
        ];
        if (titleVariants.some(variant => resumeLower.includes(variant))) {
            isJobTitlePresent = true;
        }
    }

    if (isJobTitlePresent) {
        scores.jobTitleMatch = 100;
        feedback.push('<p class="text-green-600">Your resume appears to align well with the job title and role context. This is crucial for ATS!</p>');
    } else {
        scores.jobTitleMatch = 0;
        feedback.push(`<p class="text-red-600"><strong>Action Needed:</strong> The job title "${jobTitle}" (or close variants) was not strongly detected in your resume's summary or experience sections. Ensure your resume clearly reflects the target role.</p>`);
    }
    feedback.push('<hr class="my-4 border-gray-300">');


    // --- 3. Section Labeling and Structure ---
    feedback.push(`<h3><strong>3. Section Labeling and Structure:</strong></h3>`);
    let standardSectionFoundCount = 0;
    const totalStandardSections = 6; // experience, education, skills, contact, summary, certifications
    const standardSectionHeaders = {
        experience: /^(?:work\s+experience|experience|professional\s+experience)/im,
        education: /^(?:education|academic\s+background|qualifications)/im,
        skills: /^(?:skills|abilities|proficiencies|technical\s+skills)/im,
        contact: /^(?:contact|contact\s+information)/im,
        summary: /^(?:summary|objective|profile)/im,
        certifications: /^(?:certifications|licenses|credentials)/im
    };

    let hasCreativeSectionLabels = false;
    const creativeSectionKeywords = [
        'where i\'ve worked', 'my learning journey', 'my abilities', 'my professional journey',
        'my toolbox', 'what i\'ve done', 'my background', 'my studies'
    ];

    // Check for standard sections and provide feedback
    for (const key in standardSectionHeaders) {
        if (standardSectionHeaders[key].test(resumeText)) {
            standardSectionFoundCount++;
            feedback.push(`<p class="text-green-600">"${key.charAt(0).toUpperCase() + key.slice(1)}" section found with standard heading.</p>`);
        } else {
            feedback.push(`<p class="text-red-600"><strong>Formatting Alert:</strong> "${key.charAt(0).toUpperCase() + key.slice(1)}" section not clearly found with a standard heading. This can hurt ATS parsing.</p>`);
        }
    }

    // Check for presence of *any* creative section keywords
    if (creativeSectionKeywords.some(keyword => resumeLower.includes(keyword))) {
        hasCreativeSectionLabels = true;
        feedback.push(`<p class="text-red-600"><strong>Critical Formatting Alert:</strong> Detected non-standard section headings or phrases like "${creativeSectionKeywords.filter(keyword => resumeLower.includes(keyword)).join('", "')}". ATS systems *strongly* prefer standard labels (e.g., "Experience", "Education", "Skills"). This significantly lowers parseability.</p>`);
    }

    // Calculate Section Labeling Score
    if (hasCreativeSectionLabels) {
        scores.sectionLabeling = 0; // If any creative label is present, score is very low/zero
    } else {
        scores.sectionLabeling = (standardSectionFoundCount / totalStandardSections) * 100;
    }
    feedback.push('<hr class="my-4 border-gray-300">');


    // --- 4. Location and Eligibility Tags ---
    feedback.push(`<h3><strong>4. Location and Eligibility:</strong></h3>`);
    let locationEligibilityScore = 0;

    const jobLocationRegex = /location:\s*(.*?)(?:\n|$)/i;
    const jobLocationMatchResult = jobLocationRegex.exec(jobText);
    let jobLocation = jobLocationMatchResult && jobLocationMatchResult[1] ? jobLocationMatchResult[1].trim().toLowerCase() : '';

    let isLocationMatched = false;
    if (jobLocation) {
        if (resumeLower.includes(jobLocation)) {
            isLocationMatched = true;
            locationEligibilityScore += 50;
            feedback.push(`<p class="text-green-600">Job location "${jobLocation}" found in your resume.</p>`);
        } else {
            feedback.push(`<p class="text-orange-600"><strong>Suggestion:</strong> The job description mentions "${jobLocation}". Ensure your resume clearly states your location if relevant, especially for local roles.</p>`);
        }
    } else {
        feedback.push('<p class="text-gray-600">Job description did not specify a clear location for direct matching.</p>');
    }

    const hasEligibility = /authorized to work|us citizen|green card|work authorization|visa sponsorship/i.test(resumeLower);
    if (hasEligibility) {
        locationEligibilityScore += 50;
        feedback.push('<p class="text-green-600">Work eligibility/authorization phrases detected. Good for ATS!</p>');
    } else {
        feedback.push('<p class="text-orange-600"><strong>Suggestion:</strong> For roles requiring specific work authorization, consider adding a phrase like "Authorized to work in [Country]" to your resume.</p>`);
    }
    scores.locationEligibility = locationEligibilityScore;
    feedback.push('<hr class="my-4 border-gray-300">');


    // --- 5. Formatting / Readability (Enhanced Check) ---
    feedback.push(`<h3><strong>5. Formatting / Readability:</strong></h3>`);
    let formattingScore = 100; // Start with perfect score
    let formattingFeedback = [];

    // Sub-check 1: Dense paragraphs in Experience section
    const experienceSectionContentRegex = /(?:experience|work\s+history|professional\s+experience)[\s\S]*?(?=(?:education|skills|summary|contact|certifications|$))/i;
    const experienceContentMatch = resumeText.match(experienceSectionContentRegex);

    if (experienceContentMatch && experienceContentMatch[0]) {
        const experienceContent = experienceContentMatch[0];
        const hasClearFormatting = /\n\s*[\*\-•]\s*|\n\n/.test(experienceContent); // Checks for bullet points or double line breaks

        if (!hasClearFormatting) {
            formattingScore -= 50; // Significant penalty
            formattingFeedback.push('<p class="text-red-600"><strong>Critical Alert (Dense Text):</strong> Your experience section appears to be a dense block of text without clear bullet points or line breaks. ATS systems struggle to parse unstructured content.</p>');
        } else {
            formattingFeedback.push('<p class="text-green-600">Experience section appears to have clear line breaks/bullet points.</p>`);
        }
    } else {
        formattingFeedback.push('<p class="text-orange-600">Could not definitively assess experience section formatting. Ensure it is clearly structured with bullet points.</p>');
        // No penalty here, as it might be due to missing section, not necessarily bad formatting.
    }

    // Sub-check 2: Presence of Emojis or problematic symbols (more comprehensive)
    const problematicCharsRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u2000-\u206F\u20A0-\u20CF\u2100-\u214F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u2400-\u243F\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\u2B00-\u2BFF\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u3200-\u32FF\u3300-\u33FF\uFE00-\uFE0F\uFE10-\uFE1F\uFE30-\uFE4F\uFE50-\uFE6F\uFF00-\uFFEF\u{1D000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1FB00}-\u{1FBFF}\u{1FC00}-\u{1FCFF}\u{1FD00}-\u{1FDFF}\u{1FE00}-\u{1FEFF}\u{1FF00}-\u{1FFFF}\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}\u{2CEB0}-\u{2EBEF}\u{2F800}-\u{2FA1F}\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu; // More comprehensive regex for emojis and various symbol blocks
    const excessiveAmpersands = (resumeText.match(/&/g) || []).length > 5; // More than 5 ampersands might be excessive

    if (problematicCharsRegex.test(resumeText)) {
        formattingScore = 0; // Critical penalty for any problematic characters
        formattingFeedback.push('<p class="text-red-600"><strong>Critical Alert (Symbols/Emojis):</strong> Your resume contains emojis or other complex/unreadable symbols. These are highly problematic for ATS and should be removed entirely.</p>');
    } else if (excessiveAmpersands) {
        formattingScore -= 20; // Moderate penalty for excessive ampersands
        formattingFeedback.push('<p class="text-orange-600"><strong>Suggestion (Symbols):</strong> Your resume contains several ampersands (&). While some are fine, excessive use can sometimes confuse older ATS. Consider using "and" instead.</p>');
    } else {
        formattingFeedback.push('<p class="text-green-600">No problematic emojis or excessive symbols detected.</p>');
    }

    scores.formattingReadability = Math.max(0, formattingScore); // Ensure score doesn't go below 0
    feedback.push(formattingFeedback.join(''));
    feedback.push('<hr class="my-4 border-gray-300">');


    // --- Calculate Overall ATS Score ---
    const totalScore = scores.keywordAlignment + scores.jobTitleMatch + scores.sectionLabeling + scores.locationEligibility + scores.formattingReadability;
    const overallAtsScore = totalScore / 5; // Average of 5 pain points

    let result = "FAIL";
    // Adjust overall pass threshold if needed, based on how strict you want the average to be
    if (overallAtsScore >= 50) {
        result = "PASS";
    }

    console.log("Individual Scores:", scores);
    console.log("Overall ATS Score:", overallAtsScore);
    console.log("Final ATS Result:", result);

    return { result: result, percentage: overallAtsScore.toFixed(2), feedback: feedback.join('') };
}

/**
 * Initiates the ATS scan process for the free tier.
 */
function runATSScan() {
    console.log("runATSScan function called.");
    // Prioritize uploaded content if available, otherwise use pasted content
    const resumeContent = uploadedResumeContent || document.getElementById('resumeContent').value;
    const jobDescription = document.getElementById('jobDescription').value;

    console.log("Resume Content (first 50 chars):", resumeContent.substring(0, 50));
    console.log("Job Description (first 50 chars):", jobDescription.substring(0, 50));

    if (!resumeContent.trim() || !jobDescription.trim()) {
        console.log("Missing information. Showing modal.");
        showModal("Missing Information", "Please paste or upload your resume content and paste the job description to run the scan.");
        return;
    }

    console.log("Inputs are valid. Proceeding with analysis.");
    const scanResult = analyzeATS(resumeContent, jobDescription);
    lastScanResult = scanResult; // Store the result for later detailed display

    const atsResultStatusElement = document.getElementById('atsResultStatus');
    const atsResultPercentageElement = document.getElementById('atsResultPercentage');
    const freeResultContainer = document.getElementById('freeResultContainer');

    if (atsResultStatusElement && atsResultPercentageElement && freeResultContainer) {
        atsResultStatusElement.textContent = scanResult.result;
        atsResultPercentageElement.textContent = `${scanResult.percentage}% Match`;

        if (scanResult.result === "PASS") {
            atsResultStatusElement.className = 'text-green-600 text-5xl font-extrabold mb-2';
        } else {
            atsResultStatusElement.className = 'text-red-600 text-5xl font-extrabold mb-2';
        }

        freeResultContainer.classList.remove('hidden');
        document.getElementById('detailedFeedbackContainer').classList.add('hidden'); // Hide detailed feedback initially

        console.log("Free result container shown. Scrolling to view.");
        // Scroll to free results
        freeResultContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        console.error("Error: One or more result elements not found in the DOM.");
    }
}

/**
 * Displays the detailed feedback after payment.
 * @param {object} scanResult The full scan result object.
 */
function displayDetailedFeedback(scanResult) {
    console.log("Displaying detailed feedback.");
    const detailedFeedbackElement = document.getElementById('detailedFeedback');
    const detailedFeedbackContainer = document.getElementById('detailedFeedbackContainer');
    const usageWarningElement = document.getElementById('usageWarning');

    if (detailedFeedbackElement && detailedFeedbackContainer && usageWarningElement) {
        detailedFeedbackElement.innerHTML = scanResult.feedback;
        detailedFeedbackContainer.classList.remove('hidden');

        // Simulate monthly usage check
        const monthlyScans = getMonthlyUsage();
        if (monthlyScans > MAX_FREE_SCANS_FOR_DETAILS) {
            usageWarningElement.textContent = `You've performed ${monthlyScans} detailed scans this month. If you're a consultant or business, consider our Pro Suite for optimized usage and features!`;
            usageWarningElement.classList.remove('hidden');
        } else {
            usageWarningElement.classList.add('hidden');
        }

        console.log("Detailed feedback container shown. Scrolling to view.");
        // Scroll to detailed results
        detailedFeedbackContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        console.error("Error: One or more detailed feedback elements not found in the DOM.");
    }
}

/**
 * Manages monthly usage count in localStorage.
 */
function updateMonthlyUsage() {
    const today = new Date();
    const yearMonth = `${today.getFullYear()}-${today.getMonth()}`; // YYYY-MM

    let usageData = JSON.parse(localStorage.getItem('rexaUsage')) || {};

    if (usageData.yearMonth !== yearMonth) {
        // New month, reset count
        usageData = { yearMonth: yearMonth, count: 0 };
    }

    usageData.count = (usageData.count || 0) + 1;
    localStorage.setItem('rexaUsage', JSON.stringify(usageData));
    console.log("Monthly usage updated:", usageData.count);
}

/**
 * Retrieves current monthly usage count.
 * @returns {number} The number of detailed scans performed this month.
 */
function getMonthlyUsage() {
    const today = new Date();
    const yearMonth = `${today.getFullYear()}-${today.getMonth()}`;
    let usageData = JSON.parse(localStorage.getItem('rexaUsage')) || {};
    if (usageData.yearMonth === yearMonth) {
        return usageData.count || 0;
    }
    return 0; // Reset if month changed
}


/**
 * Displays a custom modal message.
 * @param {string} title The title of the modal.
 * @param {string} message The message content of the modal.
 */
function showModal(title, message) {
    console.log("Showing custom modal:", title, message);
    // Create modal elements if they don't exist
    let modalOverlay = document.getElementById('customModalOverlay');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'customModalOverlay';
        modalOverlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 hidden';
        document.body.appendChild(modalOverlay);

        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4';
        modalOverlay.appendChild(modalContent);

        const modalTitle = document.createElement('h3');
        modalTitle.id = 'customModalTitle';
        modalTitle.className = 'text-xl font-bold text-gray-800 mb-4';
        modalContent.appendChild(modalTitle);

        const modalMessage = document.createElement('p');
        modalMessage.id = 'customModalMessage';
        modalMessage.className = 'text-gray-700 mb-6';
        modalContent.appendChild(modalMessage);

        const modalButton = document.createElement('button');
        modalButton.className = 'w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300';
        modalButton.textContent = 'OK';
        modalButton.onclick = () => modalOverlay.classList.add('hidden');
        modalContent.appendChild(modalButton);
    }

    document.getElementById('customModalTitle').textContent = title;
    document.getElementById('customModalMessage').textContent = message;
    modalOverlay.classList.remove('hidden');
}
