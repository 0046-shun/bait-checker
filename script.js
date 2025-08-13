// ベイト販売基準チェッカー - TypeScript互換JavaScript
class BaitChecker {
    constructor() {
        this.MONTHS = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const form = document.getElementById('baitForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processForm();
            });
        }
    }

    processForm() {
        const formData = this.getFormData();
        if (!this.validateFormData(formData)) {
            return;
        }

        const result = this.calculateBaitContinuation(formData);
        this.displayResult(result);
        this.displayCalendar(result);
        this.displayDetailedReason(result);
    }

    getFormData() {
        return {
            previousBaitMonth: parseInt(document.getElementById('previousBaitMonth').value),
            inspectionMonth: parseInt(document.getElementById('inspectionMonth').value),
            simultaneousContract: document.getElementById('simultaneousContract').checked
        };
    }

    validateFormData(data) {
        if (!data.previousBaitMonth || !data.inspectionMonth) {
            alert('前回ベイト月と点検月は必須です。');
            return false;
        }
        return true;
    }

    calculateBaitContinuation(data) {
        const { previousBaitMonth, inspectionMonth, simultaneousContract } = data;
        
        // 現在の月を取得
        const currentMonth = new Date().getMonth() + 1; // 0-11 → 1-12
        
        // 現在の月が前回施工月前後3ヶ月内かどうか
        const monthsWithin3 = this.getMonthsWithinRange(previousBaitMonth, 3);
        const isWithin3Months = monthsWithin3.includes(currentMonth);
        
        // 点検月に遠ざからないかの判定
        const isNotMovingAwayFromInspection = this.isNotMovingAwayFromInspection(previousBaitMonth, currentMonth, inspectionMonth);
        
        // 判定ロジック
        let canContinue = false;
        let reason = '';
        let priority = '';

        if (isWithin3Months && isNotMovingAwayFromInspection) {
            canContinue = true;
            reason = '前回施工月±3ヶ月以内且つ点検月に遠ざかっていない為';
            priority = 'high';
        } else if (isWithin3Months && !isNotMovingAwayFromInspection) {
            canContinue = false;
            reason = '点検月から遠ざかる為';
            priority = 'low';
        } else {
            canContinue = false;
            reason = '前回施工月±3ヶ月の範囲外';
            priority = 'low';
        }

        // 施工可能月の計算
        const availableMonths = this.calculateAvailableMonths(previousBaitMonth, inspectionMonth);
        const optimalMonth = this.calculateOptimalMonth(availableMonths, inspectionMonth);

        return {
            canContinue,
            reason,
            priority,
            availableMonths,
            optimalMonth,
            data
        };
    }

    getMonthsWithinRange(centerMonth, range) {
        const months = [];
        for (let i = -range; i <= range; i++) {
            let month = centerMonth + i;
            if (month < 1) month += 12;
            if (month > 12) month -= 12;
            months.push(month);
        }
        return months;
    }

    calculateCircularDistance(month1, month2) {
        const distance = Math.abs(month1 - month2);
        return Math.min(distance, 12 - distance);
    }

    isMovingTowardInspection(previousBaitMonth, currentMonth, inspectionMonth) {
        // 前回ベイト月から点検月への方向性を判定
        // 点検月が前回ベイト月より大きい場合（例：8月→12月）
        if (inspectionMonth > previousBaitMonth) {
            return currentMonth >= previousBaitMonth && currentMonth <= inspectionMonth;
        }
        // 点検月が前回ベイト月より小さい場合（例：12月→2月）
        else if (inspectionMonth < previousBaitMonth) {
            return currentMonth >= previousBaitMonth || currentMonth <= inspectionMonth;
        }
        // 同じ月の場合
        else {
            return currentMonth === previousBaitMonth;
        }
    }

    isNotMovingAwayFromInspection(previousBaitMonth, currentMonth, inspectionMonth) {
        // 点検月に遠ざからないかの判定
        // 前回施工月から現在の月への移動が、点検月方向への移動または点検月前後3ヶ月内であるか
        
        // 点検月前後3ヶ月内の場合は遠ざかっていない
        const inspectionRange = this.getMonthsWithinRange(inspectionMonth, 3);
        if (inspectionRange.includes(currentMonth)) {
            return true;
        }
        
        // 前回施工月から点検月への方向性を判定
        // 前回施工月が点検月より小さい場合（例：8月→12月）
        if (previousBaitMonth < inspectionMonth) {
            // 現在の月が前回施工月以上で点検月以下なら遠ざかっていない
            return currentMonth >= previousBaitMonth && currentMonth <= inspectionMonth;
        }
        // 前回施工月が点検月より大きい場合（例：12月→2月）
        else if (previousBaitMonth > inspectionMonth) {
            // 現在の月が前回施工月以上または点検月以下なら遠ざかっていない
            return currentMonth >= previousBaitMonth || currentMonth <= inspectionMonth;
        }
        // 同じ月の場合
        else {
            return currentMonth === previousBaitMonth;
        }
    }

    calculateAvailableMonths(previousBaitMonth, inspectionMonth) {
        const baitRange = this.getMonthsWithinRange(previousBaitMonth, 3);
        
        // 前回ベイト月前後3ヶ月内で、点検月に遠ざからない月を施工可能とする
        const availableMonths = baitRange.filter(month => {
            // 前回ベイト月以降の判定（循環を考慮）
            const isAfterPrevious = (month >= previousBaitMonth) || 
                                  (previousBaitMonth > 12 && month <= 12);
            
            // 点検月に遠ざからないかの判定
            const isNotMovingAway = this.isNotMovingAwayFromInspection(previousBaitMonth, month, inspectionMonth);
            
            return isAfterPrevious && isNotMovingAway;
        });
        
        return availableMonths.sort((a, b) => a - b);
    }

    calculateOptimalMonth(availableMonths, inspectionMonth) {
        if (availableMonths.length === 0) return null;
        
        // 点検月に最も近い月を選択
        let optimalMonth = availableMonths[0];
        let minDistance = this.calculateCircularDistance(optimalMonth, inspectionMonth);
        
        for (const month of availableMonths) {
            const distance = this.calculateCircularDistance(month, inspectionMonth);
            if (distance < minDistance) {
                minDistance = distance;
                optimalMonth = month;
            }
        }
        
        return optimalMonth;
    }

    displayResult(result) {
        const judgmentResult = document.getElementById('judgmentResult');
        
        if (!judgmentResult) return;
        
        const statusClass = result.canContinue ? 'success' : 'danger';
        const statusText = result.canContinue ? '継続可能' : '継続不可';
        
        judgmentResult.innerHTML = `
            <div class="result-card ${statusClass}">
                <h6 class="mb-2">判定結果: ${statusText}</h6>
                <p class="mb-2"><strong>理由:</strong> ${result.reason}</p>
                <p class="mb-0"><strong>優先度:</strong> ${this.getPriorityText(result.priority)}</p>
            </div>
        `;
    }

    displayCalendar(result) {
        const calendarGrid = document.getElementById('calendarGrid');
        
        if (!calendarGrid) return;
        
        let calendarHTML = '';
        for (let month = 1; month <= 12; month++) {
            let monthClass = 'unavailable';
            let monthText = '不可';
            
            if (result.availableMonths.includes(month)) {
                if (month === result.optimalMonth) {
                    monthClass = 'optimal';
                    monthText = '最適';
                } else {
                    monthClass = 'available';
                    monthText = '可能';
                }
            }
            
            calendarHTML += `
                <div class="calendar-month-compact ${monthClass}">
                    <div class="month-number">${month}</div>
                    <div class="month-label">${this.MONTHS[month - 1]}</div>
                    <div class="month-label">${monthText}</div>
                </div>
            `;
        }
        
        calendarGrid.innerHTML = calendarHTML;
    }

    displayDetailedReason(result) {
        const detailedReason = document.getElementById('detailedReason');
        if (!detailedReason) return;
        
        const { data, availableMonths, optimalMonth } = result;
        
        // 現在の月を取得
        const currentMonth = new Date().getMonth() + 1;
        
        let reasonHTML = `
            <div class="result-card info">
                <h6 class="mb-3">詳細判定理由</h6>
                <div class="reason-item">
                    <strong>前回ベイト月:</strong> ${data.previousBaitMonth}月
                </div>
                <div class="reason-item">
                    <strong>点検月:</strong> ${data.inspectionMonth}月
                </div>
                <div class="reason-item">
                    <strong>現在の月:</strong> ${currentMonth}月
                </div>
                <div class="reason-item">
                    <strong>管理年数:</strong> 5年（ベイト・消毒共通）
                </div>
                <div class="reason-item">
                    <strong>同時契約:</strong> ${data.simultaneousContract ? 'はい' : 'いいえ'}
                </div>
                <div class="reason-item">
                    <strong>前回施工月範囲:</strong> ${data.previousBaitMonth}月前後3ヶ月
                </div>
                <div class="reason-item">
                    <strong>施工可能月:</strong> ${availableMonths.map(m => m + '月').join(', ')}
                </div>
                <div class="reason-item">
                    <strong>最適月:</strong> ${optimalMonth ? optimalMonth + '月' : 'なし'}
                </div>
            </div>
        `;
        
        detailedReason.innerHTML = reasonHTML;
    }

    getPriorityText(priority) {
        const priorityMap = {
            'high': '高（推奨）',
            'medium': '中（条件付き）',
            'low': '低（非推奨）',
            'warning': '要確認'
        };
        return priorityMap[priority] || priority;
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    new BaitChecker();
});
