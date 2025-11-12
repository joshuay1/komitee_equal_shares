// tableBarChart.js
// Description: Each cell in a specific column is turned into a bar chart
// by treating the cell's data-value as a direct percentage (0..100).

export function generateTableBarCharts({
    tableElement,
    columnIndex,
    barWidth = 100,
    barColor = "#00c473",
    textColor = "#000",
    forceLabelInside = false
}) {
    // Rows of the table
    const rows = tableElement.rows;
    if (!rows || rows.length < 1) return;

    // 1) We'll skip the "find maximum" logic, because we want data-value to be
    //    the direct fraction or percentage already. So if data-value=45 => 45% wide bar.

    // 2) Create a hidden dummy span for measuring text widths
    const dummyLabel = document.createElement('span');
    dummyLabel.id = 'dummy-label';
    dummyLabel.style.visibility = 'hidden';
    document.body.appendChild(dummyLabel);

    // 3) For each row (including or excluding header as you like),
    //    we interpret the cell's data-value as the bar percentage.
    //    Typically, you'd skip row[0] if it's a header row.
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const cell = row.cells[columnIndex];
        if (!cell) continue; // skip if no cell in that column

        // parse
        const cellValue = parseFloat(cell.dataset.value);
        if (isNaN(cellValue)) continue;

        // The bar color might come from cell.dataset.barColor if present
        const customBarColor = cell.dataset.barColor || barColor;

        // Build the bar container
        const barContainer = document.createElement('div');
        barContainer.classList.add('bar-container');
        barContainer.style.width = barWidth + 'px';
        barContainer.style.position = 'relative';

        // The bar itself
        const bar = document.createElement('div');
        bar.classList.add('bar');
        // clamp percentage to [0..100] just in case
        let percentage = Math.max(0, Math.min(100, cellValue));
        bar.style.width = percentage + '%';
        bar.style.backgroundColor = customBarColor;
        bar.style.height = '100%';
        bar.style.textAlign = 'left';

        // We'll measure how wide the label text is
        dummyLabel.textContent = cell.innerText; // the cell's text, or you can store a label
        const labelWidth = dummyLabel.getBoundingClientRect().width;

        // Create a label span
        const labelSpan = document.createElement('span');
        labelSpan.innerText = cell.innerText;
        labelSpan.style.whiteSpace = 'nowrap';
        labelSpan.style.color = textColor;
        labelSpan.style.position = 'absolute'; // we'll decide inside or outside
        labelSpan.style.left = '4px';
        labelSpan.style.top = '0';
        // The container is barWidth wide in total; the bar is (percentage% of that).
        const barPixelWidth = (barWidth * percentage)/100;

        if (!forceLabelInside) {
            // Decide automatically if it fits
            if (labelWidth > (barPixelWidth - 8)) {
                // label doesn't fit inside the bar => place it to the right
                labelSpan.classList.add('outside');
                labelSpan.style.left = (barWidth + 5) + 'px';
            } else {
                // it fits inside the bar
                // we place it inside
                labelSpan.style.left = '4px'; 
                labelSpan.style.color = '#fff'; 
            }
        } else {
            // Force label inside
            // If it overflows, you might not see the text fully
            labelSpan.style.left = '4px'; 
            labelSpan.style.color = '#fff'; 
        }

        bar.appendChild(labelSpan);
        barContainer.appendChild(bar);

        // Clear cell & replace with container
        cell.innerHTML = '';
        cell.appendChild(barContainer);
    }

    // 4) Remove dummy
    document.body.removeChild(dummyLabel);
}
