// @flow

import { emitter } from "../util";

const PREBID_TIMEOUT = 700;

const adUnits = [
    {
        code: "div-gpt-ad-1460505661639-0",
        sizes: [[728, 90], [970, 90]],
        bids: [
            {
                bidder: "appnexus",
                params: { placementId: "10433394" },
            },
            {
                bidder: "pubmatic",
                params: {
                    publisherId: "TO ADD",
                    adSlot: "TO ADD",
                },
            },
        ],
    },
    {
        code: "div-gpt-ad-1438287399331-0",
        sizes: [[300, 250], [300, 600]],
        bids: [
            {
                bidder: "appnexus",
                params: {
                    placementId: "10433394",
                },
            },
        ],
    },
    {
        code: "div-gpt-ad-1460505748561-0",
        sizes: [[300, 250], [300, 600]],
        bids: [
            {
                bidder: "appnexus",
                params: {
                    placementId: "10433394",
                },
            },
        ],
    },
];

const adUnitPaths = [
    "/19968336/header-bid-tag1",
    "/19968336/header-bid-tag-0",
    "/19968336/header-bid-tag-0",
];

const adUnitCodes = adUnits.map(adUnit => adUnit.code);

function showGcs() {
    window.TriggerPrompt("http://www.basketball-gm.com/", new Date().getTime());
}

function showSurvata() {
    window.Survata.ready(() => {
        const s = window.Survata.createSurveywall({
            brand: "Basketball GM",
            explainer:
                "Please take this short survey to support Basketball GM!",
            disallowClose: true,
            allowSkip: false,
            contentName: new Date().toISOString(),
        });

        s.on("load", data => {
            if (data.status === "monetizable") {
                s.startInterview();
            } else {
                // If Survata doesn't have a survey to show, try GCS
                showGcs();
            }
        });
    });

    // If Survata is down, try other ad
    // eslint-disable-next-line no-use-before-define
    window.Survata.fail(() => {
        // Pass autoPlaySeasons as 0 because this code would never be reached otherwise (showAd would early exit)
        emitter.emit("showAd", "modal", 0);
    });
}

function showModal() {
    emitter.emit("updateState", { showNagModal: true });
}

let gptLoading = false;
let gptLoaded = false;

const sendAdserverRequest = () => {
    console.log("sendAdserverRequest");
    if (window.pbjs.adserverRequestSent) return;
    window.pbjs.adserverRequestSent = true;
    window.googletag.cmd.push(() => {
        window.pbjs.que.push(() => {
            window.pbjs.setTargetingForGPTAsync();
            window.googletag.pubads().refresh();
        });
    });
};

async function showBanner() {
    const initBanners = () => {
        // eslint-disable-next-line
        require("../../vendor/prebid");

        console.log("initBanners");
        return new Promise(resolve => {
            window.pbjs.que.push(() => {
                console.log("initial requestbids call");
                window.pbjs.addAdUnits(adUnits);
                window.pbjs.requestBids({
                    bidsBackHandler: sendAdserverRequest,
                });
            });

            setTimeout(() => {
                sendAdserverRequest();
            }, PREBID_TIMEOUT);

            window.googletag.cmd.push(() => {
                for (let i = 0; i < adUnits.length; i++) {
                    window.googletag
                        .defineSlot(adUnitPaths[i], adUnits[i].sizes, adUnitCodes[i])
                        .addService(window.googletag.pubads());
                }
                window.googletag.pubads().enableSingleRequest();
                window.googletag.enableServices();

                let count = 0;
                for (const adUnitCode of adUnitCodes) {
                    // eslint-disable-next-line no-loop-func
                    window.googletag.cmd.push(() => {
                        console.log("initbanners display");
                        window.googletag.display(adUnitCode);
                        count += 1;
                        if (count >= adUnitCodes.length) {
                            resolve();
                        }
                    });
                }
            });
        });
    };

    // After banners are initially loaded, use this to refresh
    const refreshBanners = () => {
        console.log("refreshBanners");
        window.pbjs.que.push(() => {
            window.pbjs.requestBids({
                timeout: PREBID_TIMEOUT,
                adUnitCodes,
                bidsBackHandler: () => {
                    console.log("bidsbackhandler", this);
                    window.pbjs.setTargetingForGPTAsync(adUnitCodes);
                    window.googletag.pubads().refresh();
                },
            });
        });
    };

    if ((window.screen && window.screen.width < 768) || window.inIframe) {
        // Hide ads on mobile, mobile is shitty enough already. Embedded iframes too, like on Sports.ws
        const wrappers = [
            "banner-ad-top-wrapper",
            "banner-ad-bottom-wrapper-1",
            "banner-ad-bottom-wrapper-logo",
            "banner-ad-bottom-wrapper-2",
        ];
        for (const wrapper of wrappers) {
            const el = document.getElementById(wrapper);
            if (el) {
                el.innerHTML = "";
            }
        }
    } else {
        const bannerAdTop = document.getElementById(adUnitCodes[0]);
        const bannerAdBottom1 = document.getElementById(adUnitCodes[1]);
        const bannerAdBottom2 = document.getElementById(adUnitCodes[2]);

        // For people using BBGM Gold, these would have been deleted in initAds
        if (bannerAdTop && bannerAdBottom1 && bannerAdBottom2) {
            if (!gptLoading && !gptLoaded) {
                gptLoading = true;
                await initBanners();
                gptLoading = false;
                gptLoaded = true;
            } else if (gptLoaded) {
                refreshBanners();
            }
        }
    }
}

export default {
    adUnitCodes,
    showBanner,
    showModal,
    showSurvata,
    showGcs,
};
