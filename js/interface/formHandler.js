// Tie-break UI removed; worker still supports tieBreaking via params, but UI was dropped

let equalSharesParams;
let paramsChanged;

function initializeTotalBudgetListener() {
    const totalBudgetSlider = document.getElementById('totalBudget');

    totalBudgetSlider.addEventListener('input', function() {
        const totalBudgetValue = parseInt(totalBudgetSlider.value, 10);
        equalSharesParams.totalBudget = totalBudgetValue;
        paramsChanged();

        const percentFilled = ((totalBudgetValue - totalBudgetSlider.min) / (totalBudgetSlider.max - totalBudgetSlider.min)) * 100;

        totalBudgetSlider.style.background = `
            linear-gradient(to right, 
                #00c473 ${percentFilled}%, 
                #ddd ${percentFilled}% 100%)`;
    });

    // Initialize background on page load
    const initialPercentFilled = ((totalBudgetSlider.value - totalBudgetSlider.min) / (totalBudgetSlider.max - totalBudgetSlider.min)) * 100;

    totalBudgetSlider.style.background = `
        linear-gradient(to right, 
            #00c473 ${initialPercentFilled}%, 
            #ddd ${initialPercentFilled}% 100%)`;
}

function initializeGroupIndiRatioListener() {
    const slider = document.getElementById('groupIndiRatio');
    const ratioOutput = document.getElementById('ratioOutput');

    slider.addEventListener('input', function() {
        const ratioValue = parseFloat(slider.value);
        const groupPercentage = Math.round(ratioValue * 100);
        const individualPercentage = 100 - groupPercentage;

        // Update data
        equalSharesParams.groupIndiRatio = ratioValue;
        paramsChanged();

        // Update percentage text
        ratioOutput.textContent = `${groupPercentage}:${individualPercentage}`;

        // Update slider background dynamically
        slider.style.background = `linear-gradient(to right, #ffa300 ${groupPercentage}%, #e91e63 ${groupPercentage}%)`;
    });

    // Initialize slider background and text
    const initialPercentage = Math.round(slider.value * 100);
    ratioOutput.textContent = `${initialPercentage}:${100 - initialPercentage}`;
    slider.style.background = `linear-gradient(to right, #ffa300 ${initialPercentage}%, #e91e63 ${initialPercentage}%)`;
}

// Removed tie-break UI (refreshTieBreakUI) as the section is not rendered

// Removed radios/checkbox UI (completion/comparison/accuracy), keep defaults in params

// Removed showCurrentChoices; no details UI remains

const defaultParams = {
    totalBudget: 0,
    tieBreaking: [],
    completion: "add1u",
    add1options: ["exhaustive", "integral"],
    comparison: "none",
    accuracy: "floats"
};

function addParametersToURL(equalSharesParams) {
    const url = new URL(window.location.href);
    for (let field in defaultParams) {
        let value = equalSharesParams[field];
        let defaultValue = defaultParams[field];
        if (Array.isArray(value)) {
            value = value.join(',');
            defaultValue = defaultValue.join(',');
        }
        if (value !== defaultValue) {
            url.searchParams.set(field, value);
        } else {
            url.searchParams.delete(field);
        }
    }
    window.history.replaceState({}, '', url);
}

export function parseURLParameters(params) {
    const url = new URL(window.location.href);
    for (let field in defaultParams) {
        let value = url.searchParams.get(field);
        if (value !== null) {
            if (Array.isArray(defaultParams[field])) {
                value = value.split(',');
            }
            params[field] = value;
        }
    }
    return;
}

/**
 * Instead of using Load buttons, we directly fetch and load mock_data.pb automatically.
 * We remove or comment out the old .addEventListener calls for loadCostButton / loadNoCostButton.
 * 
 * @param {*} fileHandler       function(fileName, fileText)
 * @param {*} moduleParamsChanged   callback to let the main code know that params changed
 * @param {*} moduleEqualSharesParams  the object that holds the user’s chosen parameters
 */
export function initializeForm(fileHandler, moduleParamsChanged, moduleEqualSharesParams) {
    equalSharesParams = moduleEqualSharesParams;
    paramsChanged = () => {
        addParametersToURL(equalSharesParams);
        moduleParamsChanged();
    };

    initializeTotalBudgetListener();
    initializeGroupIndiRatioListener();

    // Instead of wait for a button to load a file, we do it automatically:
    // e.g., we fetch 'mock_data.pb' from ./data/ directory
    const mockFileName = './data/kk25.pb'; 
    fetch(mockFileName)
        .then(resp => {
            if (!resp.ok) throw new Error(`Failed to load ${mockFileName}: ${resp.statusText}`);
            return resp.text();
        })
        .then(text => {
            // Pass through original filename to preserve context in UI
            fileHandler('kk25.pb', text);
        })
        .catch(err => {
            console.error('Error fetching mock_data:', err);
        });
    }