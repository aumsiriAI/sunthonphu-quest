// กำหนด Endpoint ของ Web App ที่ได้จาก Google Apps Script
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxamvkfuk72OOQPttIbq6hypELT2nk2GzFPe8hZ1VCli9zbf8Fst3yIm4cXxfZEMwMVyQ/exec"; 

let studentName = "";
let currentQuestions = [];
let currentIndex = 0;
let generatedCertId = "";

// โหลดระบบเมื่อ DOM พร้อมใช้งาน
document.addEventListener("DOMContentLoaded", () => {
    initEventHandlers();
});

function initEventHandlers() {
    document.getElementById("btn-start").addEventListener("click", startQuiz);
    document.getElementById("btn-retry").addEventListener("click", resetQuiz);
    document.getElementById("btn-download-cert").addEventListener("click", generatePDF);
}

// ระบบสลับหน้าจอ (State Navigator)
function switchScreen(screenId) {
    document.querySelectorAll(".card").forEach(card => card.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
}

// อัลกอริทึมสร้างและสุ่มชุดข้อสอบ (20 ข้อ จากสัดส่วนความยากเท่าๆ กัน)
function generateGameQuestions() {
    let selected = [];
    // ดึงแบบสุ่มจากทุกหมวดหมู่ ความยากละ 5 ข้อ (5 * 4 = 20 ข้อพอดี)
    selected = selected.concat(getRandomSubset(questionBank.easy, 5));
    selected = selected.concat(getRandomSubset(questionBank.medium, 5));
    selected = selected.concat(getRandomSubset(questionBank.hard, 5));
    selected = selected.concat(getRandomSubset(questionBank.expert, 5));
    return selected;
}

function getRandomSubset(arr, size) {
    let shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
}

// เริ่มต้นกิจกรรม
function startQuiz() {
    const nameInput = document.getElementById("student-name").value.trim();
    if (!nameInput) {
        alert("กรุณากรอกชื่อ-นามสกุล ก่อนเข้าสู่ประตูมิติครับ");
        return;
    }
    studentName = nameInput;
    currentQuestions = generateGameQuestions();
    currentIndex = 0;
    
    switchScreen("screen-game");
    renderQuestion();
}

// ฟังก์ชันแสดงผลข้อสอบและอัปเดตสถานะ Progress Bar
function renderQuestion() {
    const currentQuestion = currentQuestions[currentIndex];
    
    // อัปเดตข้อมูลหัวเรื่องความคืบหน้า
    document.getElementById("gate-number").innerText = `ประตูที่ ${currentIndex + 1} / 20`;
    const progressPercent = (currentIndex / 20) * 100;
    document.getElementById("progress-bar").style.width = `${progressPercent}%`;
    
    // อัปเดตโจทย์
    document.getElementById("question-text").innerText = currentQuestion.q;
    
    // อัปเดตตัวเลือก (Choice)
    const container = document.getElementById("options-container");
    container.innerHTML = "";
    
    currentQuestion.options.forEach((option, idx) => {
        const button = document.createElement("button");
        button.className = "btn btn-option";
        button.innerText = `${idx + 1}. ${option}`;
        button.addEventListener("click", () => handleAnswer(idx));
        container.appendChild(button);
    });
}

// ตรวจสอบคำตอบ
function handleAnswer(selectedIdx) {
    const currentQuestion = currentQuestions[currentIndex];
    
    if (selectedIdx === currentQuestion.answer) {
        // ตอบถูก
        currentIndex++;
        if (currentIndex >= 20) {
            // สำเร็จภารกิจผ่านด่านทั้งหมดครบ 20 ข้อ
            processSuccess();
        } else {
            // ไปข้อถัดไป
            renderQuestion();
        }
    } else {
        // ตอบผิด -> ระบบบังคับเรือแตก ย้อนกลับเริ่มต้นใหม่ทันทีตามกฎ
        switchScreen("screen-gameover");
    }
}

// จัดการเมื่อผ่านกิจกรรมสำเร็จ
function processSuccess() {
    // อัปเดตแถบวัดความคืบหน้าให้เต็ม 100%
    document.getElementById("progress-bar").style.width = "100%";
    
    // สร้างเลขอัตโนมัติในรูปแบบปีปัจจุบัน (2569)
    const timestampId = String(Date.now()).slice(-4);
    generatedCertId = `SP-2569-${timestampId}`;
    document.getElementById("cert-id-display").innerText = generatedCertId;
    
    switchScreen("screen-success");
    
    // บันทึกข้อมูลแบบ Asynchronous ลง Google Sheet ทันที
    saveDataToGoogleSheet();
}

// รีเซ็ตเพื่อเริ่มต้นระบบใหม่ทั้งหมด
function resetQuiz() {
    currentQuestions = generateGameQuestions();
    currentIndex = 0;
    switchScreen("screen-game");
    renderQuestion();
}

// ส่งข้อมูลผ่าน Fetch API ไปยัง Google Apps Script Web App
function saveDataToGoogleSheet() {
    if (WEB_APP_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") return;
    
    const payload = {
        name: studentName,
        certId: generatedCertId,
        status: "ผ่านกิจกรรม"
    };

    fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    }).catch(error => console.error("Error saving to sheet:", error));
}

// ฟังก์ชันสร้างไฟล์เกียรติบัตร PDF โดยจำลองดีไซน์ดนตรีและลวดลายตามภาพต้นฉบับ
function generatePDF() {
    const { jsPDF } = window.jspdf;
    // สร้างเอกสารแนวนอนขนาด A4 (297mm x 210mm)
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    // 1. วาดดีไซน์พื้นหลังธีมโรงเรียนเฉลิมพระเกียรติ (น้ำเงิน-ทอง)
    doc.setFillColor(11, 36, 71); // น้ำเงินหลักมืด
    doc.rect(0, 0, 297, 210, "F");
    
    // กรอบในไล่สีเหลืองทองโบราณสว่าง
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1.5);
    doc.rect(8, 8, 281, 194, "D");
    doc.setDrawColor(243, 229, 171);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 277, 190, "D");

    // พื้นหลังตรงกลางจำลองเป็นสีกระดาษโบราณนวลตาสว่างขึ้น
    doc.setFillColor(248, 246, 240);
    doc.rect(12, 12, 273, 186, "F");

    // 2. การจัดการพิมพ์ข้อความและจัดระเบียบ Text Alignment
    doc.setFont("Sarabun", "normal");
    
    // หัวข้อหลักของสถาบัน
    doc.setTextColor(25, 55, 109);
    doc.setFontSize(24);
    doc.text("โรงเรียนเฉลิมพระเกียรติ ๖๐ พรรษา", 148.5, 45, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(80, 80, 80);
    doc.text("เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า", 148.5, 60, { align: "center" });

    // 3. ชื่อผู้เรียน (จุดเปลี่ยนแปรผันตามระบบจัดวางกึ่งกลางชัดเจน สวยงามเด่นชัด)
    doc.setFontSize(26);
    doc.setTextColor(11, 36, 71);
    // เพิ่มการขีดเส้นใต้สีทองใต้ชื่อเพื่อให้สง่างามยิ่งขึ้น
    doc.text(studentName, 148.5, 82, { align: "center" });
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(98, 86, 199, 86);

    // 4. รายละเอียดกิจกรรมตามข้อมูลประกวดใบประกาศนียบัตรจริง
    doc.setFontSize(16);
    doc.setTextColor(166, 31, 31); // สีแดงชาดเน้นชื่อกิจกรรม
    doc.text("ได้เข้าร่วมกิจกรรม “แฟนพันธุ์แท้สุนทรภู่ สู่ประตูทะลุมิติ”", 148.5, 104, { align: "center" });
    
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(14);
    doc.text("ระดับชั้นมัธยมศึกษาปีที่ ๑-๖", 148.5, 114, { align: "center" });
    doc.text("กิจกรรมวันสุนทรภู่ ประจำปีการศึกษา ๒๕๖๙", 148.5, 125, { align: "center" });
    
    doc.setFontSize(13);
    doc.text("ขอให้ประสบความสุขความเจริญ และมุ่งพัฒนาตนเองสืบไป เทอญ", 148.5, 138, { align: "center" });
    doc.text("ให้ไว้ ณ วันที่ ๒๖ เดือน มิถุนายน พ.ศ.๒๕๖๙", 148.5, 148, { align: "center" });

    // 5. ลายเซ็นดิจิทัลผู้อำนวยการจำลองโครงสร้างระเบียบราชการ
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.2);
    doc.line(110, 168, 187, 168); // เส้นลงนาม
    
    doc.setFontSize(13);
    doc.text("(นางธรรมสรณ์ บัวสาย)", 148.5, 176, { align: "center" });
    doc.text("ผู้อำนวยการโรงเรียนเฉลิมพระเกียรติ ๖๐ พรรษา", 148.5, 184, { align: "center" });

    // เลขที่รหัสตรวจสอบมุมขวาล่างของแผ่นใบประกาศ
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`เลขที่เอกสารสำแดง: ${generatedCertId}`, 280, 202, { align: "right" });

    // บังคับดาวน์โหลดไฟล์ตั้งชื่ออัตโนมัติลงเครื่องคอมพิวเตอร์หรือสมาร์ตโฟน
    doc.save(`เกียรติบัตร_${studentName}_วันสุนทรภู่.pdf`);
}