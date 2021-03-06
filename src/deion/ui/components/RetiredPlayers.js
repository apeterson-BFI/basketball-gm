import PropTypes from "prop-types";
import React from "react";
import { helpers } from "../util";

const RetiredPlayers = ({ retiredPlayers, season, userTid }) => {
    return (
        <>
            <h4>Retired Players</h4>
            <p
                style={{
                    MozColumnWidth: "12em",
                    MozColumns: "12em",
                    WebkitColumns: "12em",
                    columns: "12em",
                }}
            >
                {retiredPlayers.map(p => (
                    <span
                        key={p.pid}
                        className={
                            p.stats.tid === userTid ? "table-info" : null
                        }
                    >
                        {process.env.SPORT === "football"
                            ? `${p.ratings.pos} `
                            : null}
                        <a href={helpers.leagueUrl(["player", p.pid])}>
                            {p.name}
                        </a>{" "}
                        (
                        {p.stats.tid >= 0 ? (
                            <>
                                <a
                                    href={helpers.leagueUrl([
                                        "roster",
                                        p.stats.abbrev,
                                        season,
                                    ])}
                                >
                                    {p.stats.abbrev}
                                </a>
                                ,{" "}
                            </>
                        ) : null}
                        age: {p.age}
                        {p.hof ? (
                            <>
                                ;{" "}
                                <a href={helpers.leagueUrl(["hall_of_fame"])}>
                                    <b>HoF</b>
                                </a>
                            </>
                        ) : null}
                        )<br />
                    </span>
                ))}
            </p>
        </>
    );
};

RetiredPlayers.propTypes = {
    retiredPlayers: PropTypes.arrayOf(PropTypes.object).isRequired,
    season: PropTypes.number.isRequired,
    userTid: PropTypes.number.isRequired,
};

export default RetiredPlayers;
