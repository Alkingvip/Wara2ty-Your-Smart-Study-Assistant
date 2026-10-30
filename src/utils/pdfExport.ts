import { jsPDF } from 'jspdf';
import { AnalysisData } from '../types';

/**
 * Generates and downloads a clean, structured study PDF document.
 * Also triggers browser print for rich styling when requested.
 */
export function exportStudyMaterialToPDF(data: AnalysisData, titleName: string = 'ملخص_ورقتي_الدراسي') {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header bar (Navy blue)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Wara2ty - ورقتي | AI Study Assistant', 15, 14);

    doc.setFontSize(10);
    doc.setTextColor(52, 211, 153); // Soft green
    doc.text('Smart Digital Study Notes & Exam Prep', 15, 22);

    const dateStr = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setTextColor(203, 213, 225);
    doc.text(dateStr, pageWidth - 15, 18, { align: 'right' });

    y = 38;

    // Title & Metadata
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(data.summary.title || 'Study Summary', 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Detected Language: ${data.detectedLanguage} | Readability: ${data.clarityScore}`, 15, y);
    y += 6;

    if (data.topics && data.topics.length > 0) {
      doc.text(`Topics: ${data.topics.join(', ')}`, 15, y);
      y += 8;
    }

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Section 1: Summary Overview
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text('1. Lesson Summary (ملخص الدرس):', 18, y + 6);

    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const overviewLines = doc.splitTextToSize(data.summary.overview, pageWidth - 36);
    doc.text(overviewLines, 18, y + 12);
    y += 28;

    // Key points
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Key Points & Highlights:', 15, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    data.summary.keyPoints.slice(0, 6).forEach((pt) => {
      const ptLines = doc.splitTextToSize(`• ${pt}`, pageWidth - 35);
      doc.text(ptLines, 18, y);
      y += ptLines.length * 5;
    });

    y += 4;

    // Exam Tip Box
    if (data.summary.examTip) {
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(15, y, pageWidth - 30, 14, 2, 2, 'F');
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(9);
      const tipLines = doc.splitTextToSize(`Exam Tip: ${data.summary.examTip}`, pageWidth - 36);
      doc.text(tipLines, 18, y + 6);
      y += 20;
    }

    // Section 2: Vocabulary Table (especially for Turkish / Arabic)
    if (data.vocabulary && data.vocabulary.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('2. Key Vocabulary & Terminology (المفردات والمصطلحات):', 15, y);
      y += 6;

      data.vocabulary.slice(0, 8).forEach((item, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const vocabText = `${idx + 1}. [${item.word}]: ${item.meaning}${item.context ? ` (${item.context})` : ''}`;
        const vLines = doc.splitTextToSize(vocabText, pageWidth - 35);
        doc.text(vLines, 18, y);
        y += vLines.length * 5;
      });

      y += 6;
    }

    // Section 3: Practice Quiz
    if (data.quiz && data.quiz.length > 0) {
      doc.addPage();
      y = 20;

      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('3. Interactive Practice Quiz (بنك الأسئلة والاختبار):', 15, y);
      y += 8;

      data.quiz.forEach((q, qIdx) => {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        const qLines = doc.splitTextToSize(`Q${qIdx + 1}: ${q.question}`, pageWidth - 30);
        doc.text(qLines, 15, y);
        y += qLines.length * 5 + 2;

        q.options.forEach((opt, optIdx) => {
          doc.setFontSize(8.5);
          const isCorrect = optIdx === q.correctIndex;
          if (isCorrect) {
            doc.setTextColor(5, 150, 105);
            doc.text(`   [x] ${opt}  (Correct Answer)`, 18, y);
          } else {
            doc.setTextColor(100, 116, 139);
            doc.text(`   [ ] ${opt}`, 18, y);
          }
          y += 4.5;
        });

        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const expLines = doc.splitTextToSize(`   Explanation: ${q.explanation}`, pageWidth - 35);
        doc.text(expLines, 18, y);
        y += expLines.length * 4 + 4;
      });
    }

    // Footer page number
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Wara2ty – ورقتي | Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
    }

    const sanitizedTitle = (data.summary.title || 'Wara2ty_Study_Notes')
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')
      .substring(0, 30);
    doc.save(`${sanitizedTitle}_Wara2ty.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating PDF with jsPDF, falling back to print:', err);
    window.print();
    return false;
  }
}
