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

// ฟังก์ชันสร้างไฟล์เกียรติบัตร PDF โดยการดึงภาพพื้นหลังสำเร็จรูปมาแสตมป์ชื่อนักเรียน
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const img = new Image();
    // ดึงไฟล์ภาพเกียรติบัตรตามชื่อที่คุณอุ้มตั้งไว้ในระบบจริง
    img.src = "certificate-bg.png.jpg"; 

    img.onload = function() {
        // 1. วาดรูปเกียรติบัตรที่คุณอุ้มทำไว้ลงบน PDF เต็มแผ่น A4
        doc.addImage(img, 'JPEG', 0, 0, 297, 210);

        // 2. พิมพ์ชื่อนักเรียนลงไปตรงช่องว่าง (ใช้ฟอนต์สากลตัวหนาเพื่อความสากลและป้องกันสระไทยลอย-เพี้ยนหลังบ้าน)
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(25, 55, 109); // สีน้ำเงินมืดเข้ากับตัวอักษรเดิมของคุณอุ้ม
        
        // แปะชื่อลงตรงกลางแผ่น (X: 148.5 มม., Y: 89 มม. ปรับระยะให้อยู่กลางบรรทัดว่างพอดี)
        doc.text(studentName, 148.5, 89, { align: "center" });

        // 3. พิมพ์รหัสเกียรติบัตรไว้ที่มุมขวาล่างเบา ๆ 
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`ID: ${generatedCertId}`, 275, 202, { align: "right" });

        // สั่งดาวน์โหลดลงเครื่องคอมพิวเตอร์หรือสมาร์ตโฟน
        doc.save(`เกียรติบัตร_${studentName}_วันสุนทรภู่.pdf`);
    };

    img.onerror = function() {
        alert("ระบบหาไฟล์ภาพพื้นหลังไม่เจอ กรุณาตรวจสอบว่าในคลัง GitHub มีไฟล์ชื่อ certificate-bg.png.jpg อยู่หรือไม่ครับ");
    };
}
