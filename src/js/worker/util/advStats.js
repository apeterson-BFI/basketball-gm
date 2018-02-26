// @flow

import { PHASE, g } from "../../common";
import { idb } from "../db";

// http://www.basketball-reference.com/about/per.html
const calculatePER = (players, teams, league) => {
    for (const t of teams) {
        t.stats.paceAdj = league.pace / t.stats.pace;

        // Handle divide by 0 error
        if (Number.isNaN(t.stats.paceAdj)) {
            t.stats.paceAdj = 1;
        }
    }

    const aPER = [];
    const mins = [];
    league.aPER = 0;
    for (let i = 0; i < players.length; i++) {
        const tid = players[i].tid;
	
		let ThreePct = players[i].stats.tp / players[i].stats.tpa
		let TwoPct = (players[i].stats.fg - players[i].stats.tp) / (players[i].stats.fga - players[i].stats.tpa);
		let FTPer2 = players[i].stats.fta / (players[i].stats.fga - players[i].stats.tpa);
		let BPct = players[i].stats.blk / (0.284 * players[i].stats.min);
		let SPct = players[i].stats.stl / (0.284 * players[i].stats.min);
		let ORBR = players[i].stats.orb / players[i].stats.min;
		let DRBR = players[i].stats.drb / players[i].stats.min;
		let ThreeFGA = players[i].stats.tpa / players[i].stats.fga;
		let FTPct = players[i].stats.ft / players[i].stats.fta;
		
		if(players[i].stats.tpa === 0) {
			ThreePct = 0;
		}
		
		if(players[i].stats.fga - players[i].stats.tpa === 0) {
			TwoPct = 0;
			FTPer2 = 0;
		}
		
		if(players[i].stats.min === 0) {
			BPct = 0;
			SPct = 0;
			ORBR = 0;
			DRBR = 0;
		}
		
		if(players[i].stats.fga === 0) {
			ThreeFGA = 0;
		}
		
		if(players[i].stats.fta === 0) {
			FTPct = 0;
		}

        let uPER;
		
		if(players[i].stats.min > 0) {
			uPER = -260 + 850 * ThreeFGA + 4800 * ThreePct + 750 * TwoPct + 90 * FTPct + 110 * FTPer2 + 390 * BPct + 450 * SPct + 570 * ORBR + 250 * DRBR;
		}
		else {
			uPER = 0;
		}
		
        aPER[i] = uPER;
        league.aPER += aPER[i] * players[i].stats.min;

        mins[i] = players[i].stats.min; // Save for EWA calculation
    }

    league.aPER /= league.gp * 5 * 4 * g.quarterLength;

    const PER = aPER.map(num => num * (15 / league.aPER));

    // Estimated Wins Added http://insider.espn.go.com/nba/hollinger/statistics
    const EWA = [];

    // Position Replacement Levels
    const prls = {
        PG: 11,
        G: 10.75,
        SG: 10.5,
        GF: 10.5,
        SF: 10.5,
        F: 11,
        PF: 11.5,
        FC: 11.05,
        C: 10.6,
    };

    for (let i = 0; i < players.length; i++) {
        let prl;
        if (prls.hasOwnProperty(players[i].ratings.pos)) {
            prl = prls[players[i].ratings.pos];
        } else {
            // This should never happen unless someone manually enters the wrong position, which can happen in custom roster files
            prl = 10.75;
        }

        const va = players[i].stats.min * (PER[i] - prl) / 67;

        EWA[i] = va / 30 * 0.8; // 0.8 is a fudge factor to approximate the difference between (BBGM) EWA and (real) win shares
    }

    return {
        per: PER,
        ewa: EWA,
    };
};

// https://www.basketball-reference.com/about/glossary.html
const calculatePercentages = (players, teams) => {
    const astp = [];
    const blkp = [];
    const drbp = [];
    const orbp = [];
    const stlp = [];
    const trbp = [];
    const usgp = [];

    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const t = teams[p.tid];

        if (t === undefined) {
            astp[i] = 0;
            blkp[i] = 0;
            drbp[i] = 0;
            orbp[i] = 0;
            stlp[i] = 0;
            trbp[i] = 0;
            usgp[i] = 0;
        } else {
            astp[i] =
                100 *
                p.stats.ast /
                (p.stats.min / (t.stats.min / 5) * t.stats.fg - p.stats.fg);
            blkp[i] =
                100 *
                (p.stats.blk * (t.stats.min / 5)) /
                (p.stats.min * (t.stats.oppFga - t.stats.oppTpa));
            drbp[i] =
                100 *
                (p.stats.drb * (t.stats.min / 5)) /
                (p.stats.min * (t.stats.drb + t.stats.oppOrb));
            orbp[i] =
                100 *
                (p.stats.orb * (t.stats.min / 5)) /
                (p.stats.min * (t.stats.orb + t.stats.oppDrb));
            stlp[i] =
                100 *
                (p.stats.stl * (t.stats.min / 5)) /
                (p.stats.min * t.stats.poss);
            trbp[i] =
                100 *
                (p.stats.trb * (t.stats.min / 5)) /
                (p.stats.min * (t.stats.trb + t.stats.oppTrb));
            usgp[i] =
                100 *
                ((p.stats.fga + 0.44 * p.stats.fta + p.stats.tov) *
                    (t.stats.min / 5)) /
                (p.stats.min *
                    (t.stats.fga + 0.44 * t.stats.fta + t.stats.tov));

            if (Number.isNaN(astp[i]) || astp[i] === Infinity) {
                astp[i] = 0;
            }
            if (Number.isNaN(blkp[i]) || blkp[i] === Infinity) {
                blkp[i] = 0;
            }
            if (Number.isNaN(drbp[i]) || drbp[i] === Infinity) {
                drbp[i] = 0;
            }
            if (Number.isNaN(orbp[i]) || orbp[i] === Infinity) {
                orbp[i] = 0;
            }
            if (Number.isNaN(stlp[i]) || stlp[i] === Infinity) {
                stlp[i] = 0;
            }
            if (Number.isNaN(trbp[i]) || trbp[i] === Infinity) {
                trbp[i] = 0;
            }
            if (Number.isNaN(usgp[i]) || usgp[i] === Infinity) {
                usgp[i] = 0;
            }
        }
    }

    return {
        astp,
        blkp,
        drbp,
        orbp,
        stlp,
        trbp,
        usgp,
    };
};

// https://www.basketball-reference.com/about/ratings.html
const calculateRatings = (players, teams, league) => {
    const drtg = [];
    const dws = [];
    const ortg = [];
    const ows = [];

    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const t = teams[p.tid];

        if (t === undefined) {
            drtg[i] = 0;
            ortg[i] = 0;
        } else {
            // Defensive rating

            const dorPct = t.stats.oppOrb / (t.stats.oppOrb + t.stats.drb);
            const dfgPct = t.stats.oppFg / t.stats.oppFga;
            const fmwt =
                dfgPct *
                (1 - dorPct) /
                (dfgPct * (1 - dorPct) + (1 - dfgPct) * dorPct);
            const stops1 =
                p.stats.stl +
                p.stats.blk * fmwt * (1 - 1.07 * dorPct) +
                p.stats.drb * (1 - fmwt);
            const stops2 =
                ((t.stats.oppFga - t.stats.oppFg - t.stats.blk) /
                    t.stats.min *
                    fmwt *
                    (1 - 1.07 * dorPct) +
                    (t.stats.oppTov - t.stats.stl) / t.stats.min) *
                    p.stats.min +
                p.stats.pf /
                    t.stats.pf *
                    0.4 *
                    t.stats.oppFta *
                    (1 - t.stats.oppFt / t.stats.oppFta) ** 2;
            const stops = stops1 + stops2;

            const stopPct = stops * t.stats.min / (t.stats.poss * p.stats.min);
            const dPtsPerscPoss =
                t.stats.oppPts /
                (t.stats.oppFg +
                    (1 - (1 - t.stats.oppFt / t.stats.oppFta) ** 2) *
                        t.stats.oppFta *
                        0.4);

            drtg[i] =
                t.stats.drtg +
                0.2 * (100 * dPtsPerscPoss * (1 - stopPct) - t.stats.drtg);

            // Defensive win shares
            const marginalDefense =
                p.stats.min /
                t.stats.min *
                t.stats.poss *
                (1.08 * (league.pts / league.poss) - drtg[i] / 100);
            const marginalPtsPerWin =
                0.32 * (league.pts / league.gp) * (t.stats.pace / league.pace);
            dws[i] = marginalDefense / marginalPtsPerWin;

            // Offensive rating

            const qAst =
                p.stats.min /
                    (t.stats.min / 5) *
                    (1.14 * ((t.stats.ast - p.stats.ast) / t.stats.fg)) +
                (t.stats.ast / t.stats.min * p.stats.min * 5 - p.stats.ast) /
                    (t.stats.fg / t.stats.min * p.stats.min * 5 - p.stats.fg) *
                    (1 - p.stats.min / (t.stats.min / 5));
            const fgPart =
                p.stats.fg *
                (1 -
                    0.5 *
                        ((p.stats.pts - p.stats.ft) / (2 * p.stats.fga)) *
                        qAst);
            const astPart =
                0.5 *
                ((t.stats.pts - t.stats.ft - (p.stats.pts - p.stats.ft)) /
                    (2 * (t.stats.fga - p.stats.fga))) *
                p.stats.ast;
            const ftPart =
                (1 - (1 - p.stats.ft / p.stats.fta) ** 2) * 0.4 * p.stats.fta;
            const teamScoringPoss =
                t.stats.fg +
                (1 - (1 - t.stats.ft / t.stats.fta) ** 2) * t.stats.fta * 0.4;
            const teamOrbPct = t.stats.orb / (t.stats.orb + t.stats.oppDrb);
            const teamPlayPct =
                teamScoringPoss /
                (t.stats.fga + t.stats.fta * 0.4 + t.stats.tov);
            const teamOrbWeight =
                (1 - teamOrbPct) *
                teamPlayPct /
                ((1 - teamOrbPct) * teamPlayPct +
                    teamOrbPct * (1 - teamPlayPct));
            const orbPart = p.stats.orb * teamOrbWeight * teamPlayPct;
            const scPoss =
                (fgPart + astPart + ftPart) *
                    (1 -
                        t.stats.orb /
                            teamScoringPoss *
                            teamOrbWeight *
                            teamPlayPct) +
                orbPart;

            const fgxPoss =
                (p.stats.fga - p.stats.fg) * (1 - 1.07 * teamOrbPct);
            const ftxPoss =
                (1 - p.stats.ft / p.stats.fta) ** 2 * 0.4 * p.stats.fta;
            const totPoss = scPoss + fgxPoss + ftxPoss + p.stats.tov;

            const pProdFgPart =
                2 *
                (p.stats.fg + 0.5 * p.stats.tp) *
                (1 -
                    0.5 *
                        ((p.stats.pts - p.stats.ft) / (2 * p.stats.fga)) *
                        qAst);
            const pProdAstPart =
                2 *
                ((t.stats.fg - p.stats.fg + 0.5 * (t.stats.tp - p.stats.tp)) /
                    (t.stats.fg - p.stats.fg)) *
                0.5 *
                ((t.stats.pts - t.stats.ft - (p.stats.pts - p.stats.ft)) /
                    (2 * (t.stats.fga - p.stats.fga))) *
                p.stats.ast;
            const pProdOrbPart =
                p.stats.orb *
                teamOrbWeight *
                teamPlayPct *
                (t.stats.pts /
                    (t.stats.fg +
                        (1 - (1 - t.stats.ft / t.stats.fta) ** 2) *
                            0.4 *
                            t.stats.fta));
            const pProd =
                (pProdFgPart + pProdAstPart + p.stats.ft) *
                    (1 -
                        t.stats.orb /
                            teamScoringPoss *
                            teamOrbWeight *
                            teamPlayPct) +
                pProdOrbPart;

            ortg[i] = 100 * (pProd / totPoss);

            // Offensive win shares
            const marginalOffense =
                pProd - 0.92 * (league.pts / league.poss) * totPoss;
            ows[i] = marginalOffense / marginalPtsPerWin;

            if (Number.isNaN(drtg[i]) || drtg === Infinity) {
                drtg[i] = 0;
            }
            if (Number.isNaN(dws[i]) || dws === Infinity) {
                dws[i] = 0;
            }
            if (Number.isNaN(ortg[i]) || ortg === Infinity) {
                ortg[i] = 0;
            }
            if (Number.isNaN(ows[i]) || ows === Infinity) {
                ows[i] = 0;
            }
        }
    }

    return {
        drtg,
        dws,
        ortg,
        ows,
    };
};

/**
 * Calcualte the advanced stats for each active player and write them to the database.
 *
 * Currently this is just PER.
 *
 * @memberOf util.advStats
 * @return {Promise}
 */
const advStats = async () => {
    // Total player stats (not per game averages)
    // For PER: pos, min, tp, ast, fg, ft, tov, fga, fta, trb, orb, stl, blk, pf
    // For AST%: min, fg
    // For BLK%: min, blk
    // For DRB%: min, drb
    // For ORB%: min, orb
    // For STL%: min, stl
    // For TRB%: min, trb
    // For USG%: min, fga, fta, tov
    // For DRtg: min, pf, blk, stl, drb
    // For Ortg: min, tp, ast, fg, pts, ft, fga, fta, orb
    let players = await idb.cache.players.indexGetAll("playersByTid", [
        0, // Active players have tid >= 0
        Infinity,
    ]);
    players = await idb.getCopies.playersPlus(players, {
        attrs: ["pid", "tid"],
        stats: [
            "min",
            "tp",
            "ast",
            "fg",
            "ft",
            "tov",
            "fga",
            "fta",
            "trb",
            "orb",
            "stl",
            "blk",
            "pf",
            "drb",
            "pts",
        ],
        ratings: ["pos"],
        season: g.season,
        playoffs: PHASE.PLAYOFFS === g.phase,
        regularSeason: PHASE.PLAYOFFS !== g.phase,
        statType: "totals",
    });

    // Total team stats (not per game averages)
    // For PER: gp, ft, pf, ast, fg, pts, fga, orb, tov, fta, trb, oppPts, pace
    // For AST%: min, fg
    // For BLK%: min, oppFga, oppTpa
    // For DRB%: min, drb, oppOrb
    // For ORB%: min, orb, oppDrb
    // For STL%: min, stl, poss
    // For TRB%: min, trb, oppTrb
    // For USG%: min, fga, fta, tov
    // For DRtg: blk, drb, drtg, min, oppFga, oppFg, oppFta, oppFt, oppOrb, oppPts, oppTov, stl, poss
    // For Ortg: min, pts, ft, fg, fga, fta, ast, oppDrb, orb, tp, tov, poss
    const teams = await idb.getCopies.teamsPlus({
        attrs: ["tid"],
        stats: [
            "gp",
            "ft",
            "pf",
            "ast",
            "fg",
            "pts",
            "fga",
            "orb",
            "tov",
            "fta",
            "trb",
            "oppPts",
            "pace",
            "min",
            "oppFga",
            "oppTpa",
            "drb",
            "oppOrb",
            "oppDrb",
            "oppFta",
            "oppFg",
            "oppTov",
            "oppTrb",
            "blk",
            "drtg",
            "oppFg",
            "oppFt",
            "stl",
            "tp",
            "poss",
        ],
        season: g.season,
        playoffs: PHASE.PLAYOFFS === g.phase,
        regularSeason: PHASE.PLAYOFFS !== g.phase,
        statType: "totals",
    });

    // Total league stats (not per game averages)
    // For PER: gp, ft, pf, ast, fg, pts, fga, orb, tov, fta, trb
    const leagueStats = [
        "gp",
        "ft",
        "pf",
        "ast",
        "fg",
        "pts",
        "fga",
        "orb",
        "tov",
        "fta",
        "trb",
        "pace",
        "poss",
    ];
    const league = teams.reduce((memo, t) => {
        for (const key of leagueStats) {
            if (memo.hasOwnProperty(key)) {
                memo[key] += t.stats[key];
            } else {
                memo[key] = t.stats[key];
            }
        }
        return memo;
    }, {});

    // Special case for pace - average of all teams. This is slightly wrong due to overtime and different numbers of games played, but by the end of the season the difference should be really small.
    league.pace /= g.numTeams;

    // If no games have been played, somehow, don't continue. But why would no games be played? I don't know, but it happens some times.
    if (league.gp === 0) {
        return;
    }

    const updatedStats = Object.assign(
        {},
        calculatePER(players, teams, league),
        calculatePercentages(players, teams),
        calculateRatings(players, teams, league),
    );

    // Save to database
    const keys = Object.keys(updatedStats);
    await Promise.all(
        players.map(async (p, i) => {
            const ps = await idb.cache.playerStats.indexGet(
                "playerStatsByPid",
                p.pid,
            );
            for (const key of keys) {
                // ***p stats could be NaN for upgraded leagues
                if (!Number.isNaN(updatedStats[key][i])) {
                    ps[key] = updatedStats[key][i];
                }
            }
            await idb.cache.playerStats.put(ps);
        }),
    );
};

export default advStats;
