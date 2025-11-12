export function parsePabulibWeightedFromString(filetext) {
    const meta = {};
    const projects = {};
    const votes = {};             // Stores individual votes
    const approvers = {};         // Keeps track of who voted for each project
    const rawVotesIndividuals = {}; // NEW: Stores individual votes as weighted scores

    // NEW: Store data about groups and their votes
    const groups = {};             // Stores group details
    const groupWeights = {};       // Stores group weight factors
    const rawVotesGroups = {};     // Stores weighted group votes

    const projectIdsSet = new Set();
    const voterIdsSet = new Set();

    let section = "";
    let header = [];
    let encounteredSections = new Set();

    let lineNumber = 0;
    const lines = filetext.split('\n');

    for (let line of lines) {
        lineNumber++;
        const trimmed = line.trim();
        if (trimmed.length === 0) continue; // Skip blank lines
        const row = trimmed.split(';');

        // Check for section labels
        const possibleSection = row[0].toLowerCase();
        if (['meta', 'projects', 'votes', 'groups', 'group_votes'].includes(possibleSection)) {
            section = possibleSection;
            encounteredSections.add(section);
            header = [];
            continue;
        }

        if (!section) {
            throw new Error(`Line ${lineNumber}: line found outside any recognized section.`);
        }

        if (header.length === 0) {
            header = row.map(col => col.trim());
            continue;
        }

        if (section === 'meta') {
            const [k, v] = row;
            if (!k || !v) throw new Error(`Line ${lineNumber}: Invalid meta line - needs "key;value".`);
            meta[k.trim()] = v.trim();

        } else if (section === 'projects') {
            const projectIdIdx = header.indexOf('project_id');
            const costIdx = header.indexOf('cost');
            const nameIdx = header.indexOf('name');

            const projectId = row[projectIdIdx].trim();
            if (projectIdsSet.has(projectId)) {
                throw new Error(`Line ${lineNumber}: Duplicate project_id '${projectId}'.`);
            }
            projectIdsSet.add(projectId);

            if (isNaN(row[costIdx])) {
                throw new Error(`Line ${lineNumber}: Cost is not numeric for project_id='${projectId}'.`);
            }

            projects[projectId] = {};
            for (let c = 0; c < header.length; c++) {
                projects[projectId][header[c]] = row[c].trim();
            }
            approvers[projectId] = [];

        } else if (section === 'votes') {
            const voterIdIdx = header.indexOf('voter_id');
            const projectIdIdx = header.indexOf('project_id');
            const scoreIdx = header.indexOf('score');

            const voterId = row[voterIdIdx].trim();
            const projectId = row[projectIdIdx].trim();
            const score = parseFloat(row[scoreIdx]);

            if (!voterId || !projectId || isNaN(score)) {
                throw new Error(`Line ${lineNumber}: Invalid vote format.`);
            }
            if (!projectIdsSet.has(projectId)) {
                throw new Error(`Line ${lineNumber}: Unknown project '${projectId}' in votes.`);
            }

            // Initialize vote tracking
            if (!votes[voterId]) votes[voterId] = {};
            if (!rawVotesIndividuals[voterId]) rawVotesIndividuals[voterId] = {};

            // Store score
            rawVotesIndividuals[voterId][projectId] = score;
            approvers[projectId].push(voterId);

        } else if (section === 'groups') {
            const groupIdIdx = header.indexOf('group_id');
            const weightIdx = header.indexOf('weight');

            const gId = row[groupIdIdx].trim();
            if (groups[gId]) {
                throw new Error(`Line ${lineNumber}: Duplicate group_id='${gId}'.`);
            }
            let w = parseFloat(row[weightIdx]);
            if (isNaN(w)) {
                throw new Error(`Line ${lineNumber}: Invalid weight for group_id='${gId}'.`);
            }

            groups[gId] = { group_id: gId, weight: w };
            groupWeights[gId] = w;
            rawVotesGroups[gId] = {}; // Initialize group votes

        } else if (section === 'group_votes') {
            const groupIdIdx = header.indexOf('group_id');
            const projectIdIdx = header.indexOf('project_id');
            const scoreIdx = header.indexOf('score');

            const gId = row[groupIdIdx].trim();
            const pId = row[projectIdIdx].trim();
            const sVal = parseFloat(row[scoreIdx]);

            if (!groups[gId]) {
                throw new Error(`Line ${lineNumber}: group_id='${gId}' not found in 'groups' section.`);
            }
            if (!projectIdsSet.has(pId)) {
                throw new Error(`Line ${lineNumber}: Unknown project_id='${pId}' in group_votes.`);
            }
            if (isNaN(sVal)) {
                throw new Error(`Line ${lineNumber}: Invalid numeric 'score' for group_id='${gId}', project_id='${pId}'.`);
            }

            rawVotesGroups[gId][pId] = sVal;
        }
    }

    // Ensure required sections exist
    ['meta', 'projects', 'votes'].forEach(sec => {
        if (!encounteredSections.has(sec)) {
            throw new Error(`Missing required '${sec}' section in file.`);
        }
    });

    if (isNaN(meta['budget'])) {
        throw new Error(`The 'budget' in meta section is not numeric.`);
    }

    // Return the final data structure
    return {
        meta,
        projects,
        votes,
        approvers,
        rawVotesIndividuals, // NEW: Individual votes in weighted format
        groups,
        groupWeights,
        rawVotesGroups,
    };
}
