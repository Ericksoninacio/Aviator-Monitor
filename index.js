const puppeteer = require('puppeteer');
const logger = require('./util/logger');
const config = require('./util/config');
const GameMonitor = require('./game/gameMonitor');

async function main() {
    logger.info('Iniciando Aviator Bot (MODO IDENTIFICADOR)');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    await page.goto(config.NAVIGATION.BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: config.NAVIGATION.TIMEOUT
    });

    browser.on('targetcreated', async (target) => {
        if (target.type() !== 'page') return;

        const newPage = await target.page();
        await newPage.waitForTimeout(2000);

        const url = newPage.url();
        if (!url.includes('aviator')) return;

        logger.info('Página do Aviator detectada');

        const monitor = new GameMonitor(newPage);
        await monitor.startMonitoring();
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
