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
    
    document.getElementById("gate-number").innerText = `ประตูที่ ${currentIndex + 1} / 20`;
    const progressPercent = (currentIndex / 20) * 100;
    document.getElementById("progress-bar").style.width = `${progressPercent}%`;
    
    document.getElementById("question-text").innerText = currentQuestion.q;
    
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
        currentIndex++;
        if (currentIndex >= 20) {
            processSuccess();
        } else {
            renderQuestion();
        }
    } else {
        switchScreen("screen-gameover");
    }
}

// จัดการเมื่อผ่านกิจกรรมสำเร็จ
function processSuccess() {
    document.getElementById("progress-bar").style.width = "100%";
    
    const timestampId = String(Date.now()).slice(-4);
    generatedCertId = `SP-2569-${timestampId}`;
    document.getElementById("cert-id-display").innerText = generatedCertId;
    
    switchScreen("screen-success");
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

// ฟังก์ชันสร้างไฟล์เกียรติบัตรโดยใช้ Canvas วาดตัวหนังสือไทยลงบนภาพโดยตรงเพื่อกันฟอนต์เพี้ยน
function generatePDF() {
    const { jsPDF } = window.jspdf;
    
    const img = new Image();
    img.src = "certificate-bg.png.jpg"; 

    img.onload = function() {
        // สร้างระบบ Canvas จำลองเพื่อเขียนข้อความไทยลงเนื้อภาพป้องกันสระลอย/ต่างดาว
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // กำหนดขนาดให้คมชัดสูงตามสัดส่วนภาพจริง
        canvas.width = img.width;
        canvas.height = img.height;
        
        // วาดภาพพื้นหลังลงไปก่อน
        ctx.drawImage(img, 0, 0);
        
        // ตั้งค่าฟอนต์ภาษาไทยทั่วไปที่มีในเครื่องคอมพิวเตอร์และมือถือทุกเครื่อง
        ctx.font = "bold " + Math.round(canvas.height * 0.045) + "px 'Sarabun', 'Sathu', 'Leelawadee', 'Microsoft YaHei', sans-serif";
        ctx.fillStyle = "#19376D"; // สีน้ำเงินมืดสวยงามตามธีม
        ctx.textAlign = "center";
        
        // พิมพ์ชื่อนักเรียนลงไปตรงกลางภาพเกียรติบัตร (คำนวณตำแหน่งพิกัด X, Y สัมพันธ์กับขนาดรูปพอดีเป๊ะ)
        const nameX = canvas.width / 2;
        const nameY = canvas.height * 0.428; 
        ctx.fillText(studentName, nameX, nameY);

        // พิมพ์เลขที่เอกสารขนาดเล็กไว้มุมขวาล่าง
        ctx.font = "normal " + Math.round(canvas.height * 0.018) + "px sans-serif";
        ctx.fillStyle = "#787878";
        ctx.textAlign = "right";
        ctx.fillText(`ID: ${generatedCertId}`, canvas.width * 0.93, canvas.height * 0.96);
        
        // แปลงชิ้นงานทั้งหมดออกมารวมเป็นรูปเดียวส่งเข้า PDF
        const finalImgData = canvas.toDataURL("image/jpeg", 1.0);
        
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });
        
        doc.addImage(finalImgData, 'JPEG', 0, 0, 297, 210);
        doc.save(`เกียรติบัตร_${studentName}_วันสุนทรภู่.pdf`);
    };

    img.onerror = function() {
        alert("ระบบหาไฟล์ภาพพื้นหลังไม่เจอ กรุณาตรวจสอบว่าในคลัง GitHub มีไฟล์ชื่อ certificate-bg.png.jpg อยู่หรือไม่ครับ");
    };
}
