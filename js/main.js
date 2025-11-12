import { parsePabulibWeightedFromString } from './pabulibParserWeighted.js';
import { initializeDragDrop } from './interface/dragDropHandler.js';
import { initializeForm, parseURLParameters } from './interface/formHandler.js';
import { displayResults } from './interface/displayResults.js';

let equalSharesParams = {
    totalBudget: 1400000,
    groupIndiRatio: 0.5,
    tieBreaking: [],
    completion: "add1u",
    add1options: ["exhaustive", "integral"],
    comparison: "none",
    accuracy: "floats",
    // If you want WeightedGroups by default for all files, just uncomment:
    method: "weightedGroups"
};

// Data file kk25.pb is already sanitized; no runtime sanitization needed

// Worker references
let equalSharesWorker;
let awaitingResponse = false;
const progress = document.getElementById("progress");
const progressText = document.getElementById("progress-text");

/*************************************************
 * HELPER: Clear the results display
 *************************************************/
function clearResults() {
    progress.style.display = "none";
    progressText.textContent = "";
    // We intentionally leave the current results in place until new ones arrive.
}

/*************************************************
 * HANDLING WORKER MESSAGES
 *************************************************/
const workerOnMessage = async function (e) {
    if (e.data.type == "result") {
        awaitingResponse = false;

        // dynamically load chart libraries or any other needed scripts
        await loadScript("js/libraries/sortable.min.js");
        await loadScript("js/libraries/echarts.min.js");
        await loadScript("js/libraries/xlsx.mini.min.js");

        clearResults();
    const winners = e.data.winners;
        const notes = e.data.notes;
        displayResults(instance, { winners, notes });

    } else if (e.data.type == "progress") {
        progressText.textContent = e.data.text;
    }
};

const workerOnError = function (e) {
    awaitingResponse = false;
    clearResults();
    document.getElementById('results-section').innerHTML = `<p><b>Error computing results:</b> ${e.message}</p>`;
};

/*************************************************
 * SETUP THE WORKER
 *************************************************/
function setUpWorker() {
    equalSharesWorker = new Worker("./js/methodOfEqualSharesWorker.js");
    equalSharesWorker.onmessage = workerOnMessage;
    equalSharesWorker.onerror = workerOnError;
    awaitingResponse = false;
}

function equalShares(instance, params) {
    if (awaitingResponse) {
        // If another computation is in progress, kill it and start fresh
        equalSharesWorker.terminate();
        setUpWorker();
    }
    awaitingResponse = true;
    equalSharesWorker.postMessage({ instance, params });

    document.getElementById('results-header').style.display = "block";
    // clearResults();
    progress.style.display = "block";
}

let instance;

/*************************************************
 * Attempt to parse file with Weighted Parser first,
 * fallback to old parser if that fails
 *************************************************/
function parseFile(fileName, fileText) {
    // Use the weighted parser only; legacy parser removed
    return parsePabulibWeightedFromString(fileText);
}

/*************************************************
 * After the file is parsed, compute the rule
 *************************************************/
function computeRule() {
    if (!instance) return;
    equalShares(instance, equalSharesParams);
}

/*************************************************
 * Handle Drag-Drop or File Upload
 *************************************************/
async function handleFileDrop(fileName, fileText) {
    const fileInfoDiv = document.getElementById("fileInfo");
    fileInfoDiv.style.display = "none";
    fileInfoDiv.innerHTML = "";

    // const fileInfoImg = document.createElement("img");
    const fileInfoText = document.createElement("div");
    // fileInfoDiv.appendChild(fileInfoImg);
    fileInfoDiv.appendChild(fileInfoText);
    // fileInfoImg.width = 50;

        try {
            // 1) parse file
            instance = parseFile(fileName, fileText);

            // 2) If groups exist, force method = weightedGroups
            if (instance.groups && Object.keys(instance.groups).length > 0) {
                equalSharesParams.method = "weightedGroups";
            }

            // 3) Privacy: names are already sanitized in kk25.pb; no runtime sanitization.
            // fileInfoImg.src = "img/file-earmark-check.svg";
        } catch (error) {
            fileInfoText.innerHTML = `<b>Error parsing file ${fileName}.</b><br>${error.message}`;
            // fileInfoImg.src = "img/file-earmark-x.svg";
            clearResults();
            return;
        }

    // Display summary info
    let info = `<b>${instance.meta.description}</b><br>`;
    info += `Budget limit: ${parseFloat(instance.meta.budget).toLocaleString()}<br>
        ${Object.keys(instance.projects).length} projects, ${Object.keys(instance.votes).length.toLocaleString()} votes`;
    if (Object.keys(instance.meta).includes("vote_type")) {
        if (instance.meta.vote_type !== "approval") {
            info += `<br><i>Warning: File has vote type ${instance.meta.vote_type}.
                This calculator only supports \"approval\" votes, so results may differ.</i>`;
        }
    } else {
        info += `<br><i>Warning: No vote_type in file. Interpreting as approval vote.</i>`;
    }
    fileInfoText.innerHTML = info;

    // 3) Compute with current equalSharesParams
    await computeRule();
}

    // (Runtime sanitization function removed)

/*************************************************
 * Dynamically load scripts if needed
 *************************************************/
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (!document.querySelector(`script[src=\"${src}\"]`)) {
            const scriptElement = document.createElement("script");
            scriptElement.src = src;
            scriptElement.onload = resolve;
            scriptElement.onerror = reject;
            document.head.appendChild(scriptElement);
        } else {
            resolve(); // already loaded
        }
    });
}

/*************************************************
 * MAIN INITIALIZER
 *************************************************/
async function main() {
    initializeDragDrop(handleFileDrop);
    parseURLParameters(equalSharesParams);
    initializeForm(handleFileDrop, computeRule, equalSharesParams);
    setUpWorker();
}

document.addEventListener('DOMContentLoaded', function () {
    main();
});
