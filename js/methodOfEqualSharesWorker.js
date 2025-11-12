
/**
 * Weighted Groups + Individuals
 * 
 * We handle zero group weights, zero raw scores, etc.:
 * - If sum of groupWeights is 0, effectively no group budget is distributed.
 * - If sumRaw(...) is 0, that group/individual doesn't contribute to that project.
 */
// Robust loading of fraction library across different hosting roots (direct folder vs repo root)
(() => {
    const candidatePaths = [
        './libraries/fraction.min.js',
        // If page served from a subfolder, derive folder path from worker URL
        (self.location.href.replace(/methodOfEqualSharesWorker\.js.*$/, '') + 'libraries/fraction.min.js'),
        // Explicit subfolder fallback (adjust if project folder name changes)
        '/komitee_equal_shares/js/libraries/fraction.min.js'
    ];
    let loaded = false; let lastErr;
    for (const p of candidatePaths) {
        try { importScripts(p); loaded = true; break; } catch (e) { lastErr = e; }
    }
    if (!loaded) {
        // Notify main thread; computation will fail gracefully with message
        self.postMessage({ type: 'progress', text: 'Failed to load fraction.min.js: ' + (lastErr?.message || 'unknown error') });
    }
})();

/**
 * Sum an array of numbers (floats).
 */
function sum(arr) {
    let res = 0;
    for (let x of arr) {
        res += x;
    }
    return res;
}

/**
 * Summation for fraction objects (for fraction-based MES).
 */
function fractionSum(xs, zero) {
    return xs.reduce((a, b) => a.add(b), zero);
}

/**
 * Tie-breaking among candidate sets that have the same "score" or "support."
 */
function breakTies(N, C, cost, approvers, params, choices) {
    let remaining = [...choices];
    for (let method of params.tieBreaking) {
        if (method === "maxVotes") {
            const bestCount = Math.max(...remaining.map(c => approvers[c].length));
            remaining = remaining.filter(c => approvers[c].length === bestCount);
            if (remaining.length > 1) {
                remaining = remaining.filter(c =>
                    c === remaining.find(rc => approvers[rc].length === bestCount)
                );
            }
        } else if (method === "minCost") {
            const bestCost = Math.min(...remaining.map(c => cost[c]));
            remaining = remaining.filter(c => cost[c] === bestCost);
            if (remaining.length > 1) {
                remaining = remaining.filter(c =>
                    c === remaining.find(rc => cost[rc] === bestCost)
                );
            }
        } else if (method === "maxCost") {
            const bestCost = Math.max(...remaining.map(c => cost[c]));
            remaining = remaining.filter(c => cost[c] === bestCost);
            if (remaining.length > 1) {
                remaining = remaining.filter(c =>
                    c === remaining.find(rc => cost[rc] === bestCost)
                );
            }
        } else {
            // Possibly a custom tie-breaking array
            if (!Array.isArray(method)) {
                throw new Error(`Unknown tie-breaking method: ${method}`);
            }
            const firstMatch = method.find(c => remaining.includes(c));
            if (firstMatch !== undefined) {
                remaining = [firstMatch];
            }
        }
        if (remaining.length <= 1) {
            break;
        }
    }
    if (remaining.length === 0) {
        throw new Error(`Tie-breaking failed in a way that shouldn't happen: ${choices}`);
    }
    return remaining;
}

/**
 * Weighted Groups + Individuals
 * 
 * We also track each individual's spending in:
 *   report.spentByIndividualOnProject[projectId][individualId]
 * Then at the end, we sum that into 
 *   spentByAllIndividualsOnProject[projectId]
 * and we also sum allIndividualsScore[projectId].
 */function equalSharesWeightedGroups(
    groups,
    groupWeights,
    individuals,
    projects,
    costs,
    rawVotesGroups,
    rawVotesInds,
    totalBudget,
    groupIndiRatio,
    params
) {
    // 1) Split totalBudget => groupIndiRatio for groups, (1-groupIndiRatio) for individuals
    const Bgroups = totalBudget * groupIndiRatio;
    const Bindiv = totalBudget * (1 - groupIndiRatio);

    // 2) Distribute among groups by weight
    let sumW = 0;
    for (let g of groups) {
        let w = groupWeights[g] || 0;
        if (w < 0) w = 0;  // fallback if negative
        sumW += w;
    }

    const leftoverGroup = {};
    const initialGroup = {};
    if (sumW > 1e-12) {
        for (let g of groups) {
            let norm = (groupWeights[g] || 0) / sumW;
            let share = norm * Bgroups;
            leftoverGroup[g] = share;
            initialGroup[g] = share;
        }
    } else {
        // no weights => no group budget
        for (let g of groups) {
            leftoverGroup[g] = 0;
            initialGroup[g] = 0;
        }
    }

    // 3) Distribute among individuals
    const leftoverInd = {};
    const initialInd = {};
    if (individuals.length > 0) {
        let shareInd = Bindiv / individuals.length;
        for (let i of individuals) {
            leftoverInd[i] = shareInd;
            initialInd[i] = shareInd;
        }
    }

    // 4) We'll store how much each group & each individual spends
    const report = {
        initialGroup,
        initialInd,
        spentByGroupOnProject: {},       // e.g. spentByGroupOnProject[pID][gID]
        spentByIndividualOnProject: {},  // e.g. spentByIndividualOnProject[pID][iID]
        totalSpentPerProject: {}         // Track actual total deductions for each project
    };

    // sum of raw votes across all projects for that group or individual
    function sumRawVotes(obj) {
        let s = 0;
        for (let p in obj) {
            s += obj[p];
        }
        return s;
    }

    let remaining = new Set(projects);
    let winners = [];
    let totalSpent = 0;

    // main loop
    while (true) {
        let bestP = null;
        let bestSupport = 0;
        let tieProjects = [];

        // find project with the highest total support
        for (let p of remaining) {
            let totalS = 0;

            // groups
            for (let g of groups) {
                const groupScoreSum = sumRawVotes(rawVotesGroups[g]);
                if (groupScoreSum > 1e-12) {
                    let groupContribution = leftoverGroup[g] * (rawVotesGroups[g][p] / groupScoreSum);
                    if (!isNaN(groupContribution) && groupContribution > 0) {
                        totalS += groupContribution;
                    }
                }
            }
            // individuals
            for (let i of individuals) {
                const iScoreSum = sumRawVotes(rawVotesInds[i]);
                if (iScoreSum > 1e-12) {
                    let indContribution = leftoverInd[i] * (rawVotesInds[i][p] / iScoreSum);
                    if (!isNaN(indContribution) && indContribution > 0) {
                        totalS += indContribution;
                    }
                }
            }

            if (totalS > bestSupport) {
                bestSupport = totalS;
                bestP = p;
                tieProjects = [p];
            } else if (Math.abs(totalS - bestSupport) < 1e-9) {
                tieProjects.push(p);
            }
        }

        if (!bestP) {
            // no project found => done
            break;
        }

        // tie-break if needed
        if (tieProjects.length > 1 && params.tieBreaking) {
            // or call breakTies(...) 
            bestP = tieProjects[0];
        }

        // check affordability
        const costP = costs[bestP];
        
        // Calculate how much money is theoretically available
        let sumPossible = 0;
        for (let g of groups) {
            if ((rawVotesGroups[g][bestP] || 0) > 0) {
                sumPossible += leftoverGroup[g];
            }
        }
        for (let i of individuals) {
            if ((rawVotesInds[i][bestP] || 0) > 0) {
                sumPossible += leftoverInd[i];
            }
        }
        
        // If clearly not affordable, skip
        if (sumPossible < costP) {
            remaining.delete(bestP);
            continue;
        }

        // Initialize containers
        if (!report.spentByGroupOnProject[bestP]) {
            report.spentByGroupOnProject[bestP] = {};
        }
        if (!report.spentByIndividualOnProject[bestP]) {
            report.spentByIndividualOnProject[bestP] = {};
        }

        // Calculate the proportional contributions
        let totalSBest = 0;
        let groupNorm = {};
        let indNorm = {};

        for (let g of groups) {
            let groupScoreSum = sumRawVotes(rawVotesGroups[g]);
            if (groupScoreSum > 1e-12) {
                let groupC = leftoverGroup[g] * (rawVotesGroups[g][bestP] / groupScoreSum);
                if (!isNaN(groupC) && groupC > 0) {
                    groupNorm[g] = groupC;
                    totalSBest += groupC;
                } else {
                    groupNorm[g] = 0;
                }
            } else {
                groupNorm[g] = 0;
            }
        }
        for (let i of individuals) {
            let iScoreSum = sumRawVotes(rawVotesInds[i]);
            if (iScoreSum > 1e-12) {
                let iC = leftoverInd[i] * (rawVotesInds[i][bestP] / iScoreSum);
                if (!isNaN(iC) && iC > 0) {
                    indNorm[i] = iC;
                    totalSBest += iC;
                } else {
                    indNorm[i] = 0;
                }
            } else {
                indNorm[i] = 0;
            }
        }

        if (totalSBest < 1e-12) {
            remaining.delete(bestP);
            continue;
        }

        // Do a more accurate affordability check - if the proportional support
        // is too small relative to cost, we might not be able to fund this project
        if (totalSBest < costP * 0.95) { // Allow for small rounding errors
            remaining.delete(bestP);
            continue;
        }

        // Track how much is actually deducted
        let actualDeducted = 0;

        // Deduct proportionally
        for (let g of groups) {
            let frac = groupNorm[g] / totalSBest;
            if (frac > 0) {
                let deduction = frac * costP;
                leftoverGroup[g] = Math.max(0, leftoverGroup[g] - deduction);
                
                // Record group g spent
                report.spentByGroupOnProject[bestP][g] = deduction;
                actualDeducted += deduction;
            } else {
                report.spentByGroupOnProject[bestP][g] = 0;
            }
        }
        
        for (let i of individuals) {
            let frac = indNorm[i] / totalSBest;
            if (frac > 0) {
                let deduction = frac * costP;
                leftoverInd[i] = Math.max(0, leftoverInd[i] - deduction);

                // Record individual's spending
                report.spentByIndividualOnProject[bestP][i] = deduction;
                actualDeducted += deduction;
            } else {
                report.spentByIndividualOnProject[bestP][i] = 0;
            }
        }
        
        // Record the actual amount spent
        report.totalSpentPerProject[bestP] = actualDeducted;
        totalSpent += actualDeducted;

        winners.push(bestP);
        remaining.delete(bestP);
    }

    // Verify total spending aligns with winning project costs
    let totalWinnerCost = 0;
    for (let p of winners) {
        totalWinnerCost += costs[p];
    }
    
    console.log(`Method of Equal Shares - Budget Report:
      Total budget: ${totalBudget}
      Total spent: ${totalSpent}
      Total cost of winners: ${totalWinnerCost}
      Winning projects: ${winners.length}`);

    return {
        winners,
        leftoverGroup,
        leftoverInd,
        report
    };
}

//----------------------------------
// Standard MES fallback
//----------------------------------

function equalSharesFixedBudgetFractions(N, C, cost, approvers, B, params, reportDetails=false, reportProgress=false) {
    let budget = {};
    for (let i of N) {
        budget[i] = new Fraction(B).div(N.length);
    }
    const report = {};
    report.moneyBehindCandidate = {};
    report.effectiveVoteCount = {};
    report.endowment = B / N.length;

    let remaining = new Map();
    for (let c of C) {
        if (cost[c] > 0 && approvers[c].length > 0) {
            remaining.set(c, new Fraction(approvers[c].length));
        }
        report.moneyBehindCandidate[c] = [];
        report.effectiveVoteCount[c] = [];
    }
    let winners = [];

    while (true) {
        let best = [];
        let bestEffVoteCount = new Fraction(0);

        let remainingSorted = [...remaining.keys()];
        remainingSorted.sort((a, b) => remaining.get(b).compare(remaining.get(a)));

        for (let c of remainingSorted) {
            let prevEff = remaining.get(c);
            if (prevEff.compare(bestEffVoteCount) < 0 && !reportDetails) {
                break;
            }
            const moneyBehindNow = fractionSum(approvers[c].map(i => budget[i]), new Fraction(0));
            report.moneyBehindCandidate[c].push(moneyBehindNow.valueOf());

            if (moneyBehindNow.compare(cost[c]) < 0) {
                remaining.delete(c);
                report.effectiveVoteCount[c].push(0);
                continue;
            }

            // compute the effective vote count
            approvers[c].sort((a, b) => budget[a].compare(budget[b]));
            let paidSoFar = new Fraction(0);
            let denominator = approvers[c].length;
            for (let j = 0; j < approvers[c].length; j++) {
                let i = approvers[c][j];
                let maxPayment = new Fraction(cost[c]).sub(paidSoFar).div(denominator);
                let effVoteCount = new Fraction(cost[c]).div(maxPayment);
                if (maxPayment.compare(budget[i]) > 0) {
                    paidSoFar = paidSoFar.add(budget[i]);
                    denominator -= 1;
                } else {
                    remaining.set(c, effVoteCount);
                    report.effectiveVoteCount[c].push(effVoteCount.valueOf());
                    if (effVoteCount.compare(bestEffVoteCount) > 0) {
                        bestEffVoteCount = effVoteCount;
                        best = [c];
                    } else if (effVoteCount.equals(bestEffVoteCount)) {
                        best.push(c);
                    }
                    break;
                }
            }
        }
        if (!best.length) {
            break;
        }
        best = breakTies(N, C, cost, approvers, params, best);
        let chosen = best[0];
        winners.push(chosen);

        if (reportProgress) {
            postMessage({
                type: "progress",
                text: `${Math.floor(100*sum(winners.map(cc => cost[cc])) / B)}%`
            });
        }

        let bestMaxPayment = new Fraction(cost[chosen]).div(bestEffVoteCount);
        for (let i of approvers[chosen]) {
            if (budget[i].compare(bestMaxPayment) > 0) {
                budget[i] = budget[i].sub(bestMaxPayment);
            } else {
                budget[i] = new Fraction(0);
            }
        }
        remaining.delete(chosen);
    }

    return { winners, report };
}

function equalSharesFixedBudgetFloats(N, C, cost, approvers, B, params, reportDetails=false, reportProgress=false) {
    let budget = {};
    const endowment = B / N.length;
    for (let i of N) {
        budget[i] = endowment;
    }
    const report = {};
    report.moneyBehindCandidate = {};
    report.effectiveVoteCount = {};
    report.endowment = B / N.length;

    let remaining = new Map();
    for (let c of C) {
        if (cost[c] > 0 && approvers[c].length > 0) {
            remaining.set(c, approvers[c].length);
        }
        report.moneyBehindCandidate[c] = [];
        report.effectiveVoteCount[c] = [];
    }
    let winners = [];

    while (true) {
        let best = [];
        let bestEffVoteCount = 0;

        let remainingSorted = [...remaining.keys()];
        remainingSorted.sort((a, b) => remaining.get(b) - remaining.get(a));

        for (let c of remainingSorted) {
            let prevEff = remaining.get(c);
            if (prevEff < bestEffVoteCount && !reportDetails) {
                break;
            }
            const moneyBehindNow = sum(approvers[c].map(i => budget[i]));
            report.moneyBehindCandidate[c].push(moneyBehindNow);

            if (moneyBehindNow < cost[c]) {
                remaining.delete(c);
                report.effectiveVoteCount[c].push(0);
                continue;
            }
            approvers[c].sort((a, b) => budget[a] - budget[b]);
            let paidSoFar = 0;
            let denominator = approvers[c].length;
            for (let j = 0; j < approvers[c].length; j++) {
                const i = approvers[c][j];
                const maxPayment = (cost[c] - paidSoFar) / denominator;
                if (maxPayment > budget[i]) {
                    paidSoFar += budget[i];
                    denominator -= 1;
                } else {
                    const effVoteCount = cost[c] / maxPayment;
                    remaining.set(c, effVoteCount);
                    report.effectiveVoteCount[c].push(effVoteCount);
                    if (effVoteCount > bestEffVoteCount) {
                        bestEffVoteCount = effVoteCount;
                        best = [c];
                    } else if (effVoteCount===bestEffVoteCount) {
                        best.push(c);
                    }
                    break;
                }
            }
        }
        if (!best.length) {
            if (remaining.size > 0) {
                throw new Error(`No candidate found but some remain: ${[...remaining.keys()]}`);
            }
            break;
        }
        best = breakTies(N, C, cost, approvers, params, best);
        let chosen = best[0];
        winners.push(chosen);

        if (reportProgress) {
            postMessage({
                type: "progress",
                text: `${Math.floor(100*sum(winners.map(cc => cost[cc])) / B)}%`
            });
        }

        let bestMaxPayment = cost[chosen] / bestEffVoteCount;
        for (let i of approvers[chosen]) {
            if (budget[i] > bestMaxPayment) {
                budget[i] -= bestMaxPayment;
            } else {
                budget[i] = 0;
            }
        }
        remaining.delete(chosen);
    }

    return { winners, report };
}

function equalSharesFixedBudget(N, C, cost, approvers, B, params, reportDetails=false, reportProgress=false) {
    if (params.accuracy === "fractions") {
        return equalSharesFixedBudgetFractions(
            N, C, cost, approvers, B, params, reportDetails, reportProgress
        );
    } else if (params.accuracy === "floats") {
        return equalSharesFixedBudgetFloats(
            N, C, cost, approvers, B, params, reportDetails, reportProgress
        );
    } else {
        throw 'Unknown accuracy parameter';
    }
}

function equalSharesAdd1(N, C, cost, approvers, B, params) {
    let startBudget = B;
    if (params.add1options.includes("integral")) {
        const perVoter = Math.floor(B / N.length);
        startBudget = perVoter * N.length;
    }
    let mes = equalSharesFixedBudget(
        N, C, cost, approvers, startBudget, params, false, true
    ).winners;
    let currentCost = sum(mes.map(c => cost[c]));
    postMessage({
        type: "progress",
        text: `${Math.floor(100*currentCost / B)}%`
    });
    let budget = startBudget;

    while (true) {
        if (params.add1options.includes("exhaustive")) {
            let isExhaustive = true;
            for (let extra of C) {
                if (!mes.includes(extra) && currentCost + cost[extra] <= B) {
                    isExhaustive = false;
                    break;
                }
            }
            if (isExhaustive) {
                break;
            }
        }
        let nextBudget = budget + N.length;
        let nextMes = equalSharesFixedBudget(
            N, C, cost, approvers, nextBudget, params
        ).winners;
        currentCost = sum(nextMes.map(c => cost[c]));
        if (currentCost <= B) {
            postMessage({
                type: "progress",
                text: `${Math.floor(100*currentCost / B)}%`
            });
            budget = nextBudget;
            mes = nextMes;
        } else {
            break;
        }
    }
    postMessage({ type: "progress", text: `Finishing` });
    let result = equalSharesFixedBudget(
        N, C, cost, approvers, budget, params, true
    );
    return { winners: result.winners, report: result.report };
}

/**
 * A \"Utilitarian\" approach that picks next project with highest # of approvals
 * until no budget remains.
 */
function utilitarianCompletion(N, C, cost, approvers, B, alreadyWinners) {
    let winners = [...alreadyWinners];
    let costSoFar = sum(winners.map(c => cost[c]));
    let sortedC = [...C];
    let addedByUtlitarianCompletion = [];

    sortedC.sort((a, b) => approvers[b].length - approvers[a].length);

    for (let c of sortedC) {
        if (winners.includes(c) || costSoFar + cost[c] > B) {
            continue;
        }
        winners.push(c);
        addedByUtlitarianCompletion.push(c);
        costSoFar += cost[c];
    }
    return { winners, addedByUtlitarianCompletion };
}

/**
 * Compares the MES result vs a \"greedy\" approach to see which is more popular
 */
function comparisonStep(N, C, cost, approvers, B, greedy, winners, params) {
    let prefersMES = 0;
    let prefersGreedy = 0;

    if (params.comparison == "satisfaction") {
        const mesSatisfaction = {};
        const greedySatisfaction = {};
        for (let [candidates, satisfaction] of [[winners, mesSatisfaction], [greedy, greedySatisfaction]]) {
            for (let c of candidates) {
                for (let i of approvers[c]) {
                    if (!satisfaction[i]) {
                        satisfaction[i] = 0;
                    }
                    satisfaction[i]++;
                }
            }
        }
        for (let i of N) {
            if ((mesSatisfaction[i] || 0) > (greedySatisfaction[i] || 0)) {
                prefersMES++;
            } else if ((greedySatisfaction[i]||0) > (mesSatisfaction[i]||0)) {
                prefersGreedy++;
            }
        }
    } else if (params.comparison == "exclusionRatio") {
        const mesApprovals = new Set();
        for (let c of winners) {
            for (let i of approvers[c]) {
                mesApprovals.add(i);
            }
        }
        const greedyApprovals = new Set();
        for (let c of greedy) {
            for (let i of approvers[c]) {
                greedyApprovals.add(i);
            }
        }
        for (let i of N) {
            if (mesApprovals.has(i) && !greedyApprovals.has(i)) {
                prefersMES++;
            } else if (greedyApprovals.has(i) && !mesApprovals.has(i)) {
                prefersGreedy++;
            }
        }
    }

    let stickToMES = true;
    if (prefersGreedy > prefersMES) {
        stickToMES = false;
    }
    return { stickToMES, prefersMES, prefersGreedy };
}

/**
 * Gather basic stats about the outcome (like total cost, average # approvals).
 */
function gatherOutcomeStatistics(N, C, cost, approvers, B, winners) {
    const stats = {};
    stats.totalCost = sum(winners.map(c => cost[c] || 0));
    stats.avgApprovedProjects = sum(winners.map(c => (approvers[c]||[]).length)) / N.length || 0;
    stats.avgCostOfWinningApprovedProjects = sum(winners.map(c => (approvers[c]||[]).length * cost[c])) / N.length || 0;

    // distribution of how many winning projects each voter i approves
    const voterUtility = {};
    for (let i of N) {
        voterUtility[i] = 0;
    }
    for (let c of winners) {
        for (let i of (approvers[c] || [])) {
            voterUtility[i]++;
        }
    }
    stats.utilityDistribution = {};
    for (let util = 0; util <= winners.length; util++) {
        stats.utilityDistribution[util] = 0;
    }
    for (let i of N) {
        stats.utilityDistribution[voterUtility[i]]++;
    }
    return stats;
}

/**
 * The main function called by onmessage. 
 * 1) Weighted Groups if method=weightedGroups
 * 2) Otherwise do standard MES, possibly with Add1 or comparison
 */
function equalShares(instance, params) {
    const { meta, projects, votes, approvers } = instance;
    const N = Object.keys(votes);
    const C = Object.keys(projects);

    let B;
    let groupIndiRatio;
    try {
        B = params.totalBudget > 0 ? params.totalBudget : parseFloat(meta.budget);
        groupIndiRatio = (params.groupIndiRatio != null) 
            ? parseFloat(params.groupIndiRatio)
            : 0.5; 
        if (isNaN(groupIndiRatio) || groupIndiRatio < 0 || groupIndiRatio > 1) {
            groupIndiRatio = 0.5;
        }
    } catch (e) {
        throw new Error(`Error parsing budget or ratio: ${e}`);
    }

    // parse cost array
    const cost = {};
    for (let c of C) {
        cost[c] = parseFloat(projects[c].cost)||0;
    }

    // Weighted approach if method= "weightedGroups"
    if (params.method === "weightedGroups") {
        const groupIDs = Object.keys(instance.groups||{});
        const groupWeights= instance.groupWeights||{};
        const individuals = N;

        // rawVotesGroups => from instance.rawVotesGroups
        // rawVotesInds => build from approvals if not present
        const rawVotesGroups= instance.rawVotesGroups||{};
        const rawVotesInds  = {};
        for(let i of individuals) {
            rawVotesInds[i]= {};
            for(let p of C) {
                rawVotesInds[i][p] = (approvers[p]||[]).includes(i)?1:0;
            }
        }

        let weightedResult = equalSharesWeightedGroups(
            groupIDs, groupWeights, individuals, C, cost,
            rawVotesGroups, rawVotesInds,
            B, groupIndiRatio, params
        );

        let winners = weightedResult.winners;

        // We want to build aggregator for ALL_INDIVIDUALS
        // => spentByAllIndividualsOnProject + allIndividualsScore
        // We'll do that by summing the new report.spentByIndividualOnProject 
        // plus summing rawVotesInds i->p
        const spentByAllInd= {};
        const allIndivScore= {};

        // For each project, sum individual spending + sum scores
        for (let p of C) {
            let totalSpent= 0;
            if(!weightedResult.report.spentByIndividualOnProject[p]) {
                weightedResult.report.spentByIndividualOnProject[p]= {};
            }
            for (let i of individuals) {
                totalSpent += weightedResult.report.spentByIndividualOnProject[p][i]||0;
            }
            spentByAllInd[p]= totalSpent;

            let totalScore= 0;
            for (let i of individuals) {
                totalScore += rawVotesInds[i][p];
            }
            allIndivScore[p]= totalScore;
        }

        let notes= {
            leftoverGroup: weightedResult.leftoverGroup,
            leftoverInd:   weightedResult.leftoverInd,
            initialGroup:  weightedResult.report.initialGroup,
            initialInd:    weightedResult.report.initialInd,
            spentByGroupOnProject: weightedResult.report.spentByGroupOnProject,
            spentByIndividualOnProject: weightedResult.report.spentByIndividualOnProject,
            spentByAllIndividualsOnProject: spentByAllInd,
            allIndividualsScore: allIndivScore
        };

        // gather stats
        notes.stats= gatherOutcomeStatistics(individuals, C, cost, approvers, B, winners);
        return { winners, notes };
    }

    // Otherwise, do standard MES fallback
    const everythingAffordable = sum(Object.values(cost)) <= B;
    let result;
    if (["none","utilitarian"].includes(params.completion) || everythingAffordable) {
        result = equalSharesFixedBudget(N, C, cost, approvers, B, params, true, true);
    } else if (["add1","add1e","add1u","add1eu"].includes(params.completion)) {
        result = equalSharesAdd1(N, C, cost, approvers, B, params);
    } else {
        throw new Error("Unknown completion rule: " + params.completion);
    }

    let winners = result.winners;
    let notes = {
        endowment: result.report.endowment,
        moneyBehindCandidate: result.report.moneyBehindCandidate,
        effectiveVoteCount: result.report.effectiveVoteCount
    };

    // Possibly do utilitarian completion
    if (["utilitarian","add1u"].includes(params.completion)) {
        const compRes = utilitarianCompletion(N, C, cost, approvers, B, winners);
        winners = compRes.winners;
        notes.addedByUtlitarianCompletion = compRes.addedByUtlitarianCompletion;
    }

    // Comparison step
    const greedyRes = utilitarianCompletion(N, C, cost, approvers, B, []);
    const greedy = greedyRes.winners;
    if (params.comparison !== "none") {
        const { stickToMES, prefersMES, prefersGreedy } =
          comparisonStep(N, C, cost, approvers, B, greedy, winners, params);
        if (!stickToMES) {
            winners = greedy;
            notes.comparison = `Greedy is preferred by ${prefersGreedy} vs MES's ${prefersMES}.`;
        }
    }

    // gather stats
    notes.stats= gatherOutcomeStatistics(N, C, cost, approvers, B, winners);
    notes.greedyStats= gatherOutcomeStatistics(N, C, cost, approvers, B, greedy);

    return { winners, notes };
}

// The worker event
onmessage=(e)=>{
    const startTime= performance.now();
    const { instance, params }= e.data;
    let { winners, notes }= equalShares(instance, params);
    const endTime= performance.now();
    notes.time=((endTime- startTime)/1000).toFixed(1);
    postMessage({type:"result", winners, notes});
};