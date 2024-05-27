const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const Table = require('cli-table3');
const figlet = require('figlet');
const gradient = require('gradient-string');
const ora = require('ora');
const Chart = require('asciichart');
const asciichart = require('asciichart');
const fs = require('fs');

// Configuration
const API_ENDPOINT = 'https://api.rugcheck.xyz/v1/tokens';
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Utility function to format numbers
function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    num
  );
}

// Function to calculate and display risk score
function calculateRiskScore(data) {
  let score = 0;
  const maxScore = 100;

  // Factor 1: Liquidity (0-25 points)
  const liquidity = data.totalMarketLiquidity;
  if (liquidity < 1000) score += 25;
  else if (liquidity < 10000) score += 15;
  else if (liquidity < 100000) score += 5;

  // Factor 2: Token concentration (0-25 points)
  const topHolderPercentage = data.topHolders[0].pct;
  if (topHolderPercentage > 50) score += 25;
  else if (topHolderPercentage > 30) score += 15;
  else if (topHolderPercentage > 10) score += 5;

  // Factor 3: LP Token lock (0-20 points)
  const lpLockedPct = data.markets[0].lp.lpLockedPct;
  if (lpLockedPct < 50) score += 20;
  else if (lpLockedPct < 80) score += 10;
  else if (lpLockedPct < 95) score += 5;

  // Factor 4: Verification (0-15 points)
  if (!data.verification.jup_verified) score += 15;

  // Factor 5: Mint and Freeze authority (0-15 points)
  if (data.mintAuthority !== null || data.freezeAuthority !== null) score += 15;

  const riskScore = (score / maxScore) * 100;
  const riskLevel =
    riskScore < 20
      ? 'Low'
      : riskScore < 50
      ? 'Medium'
      : riskScore < 80
      ? 'High'
      : 'Very High';

  return { riskScore, riskLevel };
}

function getRiskColor(level) {
  switch (level) {
    case 'Low':
      return colors.green;
    case 'Medium':
      return colors.yellow;
    case 'High':
      return colors.red;
    case 'Very High':
      return colors.red.bold;
    default:
      return colors.white;
  }
}

// Function to generate token banner
function generateTokenBanner(data, riskScore, riskLevel) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="400" y="50" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" font-weight="bold">Solana Token Analysis Result</text>
      
      <text x="50" y="100" font-family="Arial, sans-serif" font-size="18">Token Name: {TOKEN_NAME}</text>
      <text x="50" y="130" font-family="Arial, sans-serif" font-size="18">Symbol: {TOKEN_SYMBOL}</text>
      <text x="50" y="160" font-family="Arial, sans-serif" font-size="18">Total Supply: {TOTAL_SUPPLY}</text>
      
      <text x="50" y="210" font-family="Arial, sans-serif" font-size="18" font-weight="bold">Risk Assessment:</text>
      <text x="70" y="240" font-family="Arial, sans-serif" font-size="24" fill="{RISK_COLOR}">Risk Score: {RISK_SCORE}%</text>
      <text x="70" y="280" font-family="Arial, sans-serif" font-size="24" fill="{RISK_COLOR}">Risk Level: {RISK_LEVEL}</text>
      
      <text x="50" y="330" font-family="Arial, sans-serif" font-size="18">Total Market Liquidity: {MARKET_LIQUIDITY}</text>
      <text x="50" y="360" font-family="Arial, sans-serif" font-size="18">LP Tokens Locked: {LP_LOCKED}%</text>
      
      <text x="790" y="390" font-family="Arial, sans-serif" font-size="12" text-anchor="end">Created by Solana Token Analyzer</text>
    </svg>`;

  // Replace placeholders in the SVG with actual data
  return svg
    .replace('{TOKEN_NAME}', data.tokenMeta.name)
    .replace('{TOKEN_SYMBOL}', data.tokenMeta.symbol)
    .replace(
      '{TOTAL_SUPPLY}',
      formatNumber(data.token.supply / Math.pow(10, data.token.decimals))
    )
    .replace('{RISK_SCORE}', riskScore.toFixed(2))
    .replace('{RISK_LEVEL}', riskLevel)
    .replace('{RISK_COLOR}', getRiskColor(riskLevel))
    .replace(
      '{MARKET_LIQUIDITY}',
      '$' + formatNumber(data.totalMarketLiquidity)
    )
    .replace(
      '{LP_LOCKED}',
      data.markets[0]?.lp?.lpLockedPct.toFixed(2) || 'N/A'
    );
}

// Function to convert SVG to PNG
async function convertSvgToPng(svgString, outputPath) {
  //   try {
  //     await sharp(Buffer.from(svgString)).png().toFile(outputPath);
  //     console.log(`Banner image saved as ${outputPath}`);
  //   } catch (error) {
  //     console.error('Error converting SVG to PNG:', error);
  //   }
}

// Main function to analyze token
async function analyzeToken(address) {
  const spinner = ora('Analyzing token...').start();

  try {
    const response = await axios.get(`${API_ENDPOINT}/${address}/report`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    spinner.succeed('Analysis complete!');

    const data = response.data;

    // Display token info
    console.log(
      '\n' +
        gradient.pastel.multiline(
          figlet.textSync('Token Analysis', { horizontalLayout: 'full' })
        )
    );

    const tokenInfoTable = new Table({
      head: [colors.cyan('Property'), colors.cyan('Value')],
      colWidths: [20, 50],
    });

    tokenInfoTable.push(
      ['Name', colors.bold(data.tokenMeta.name)],
      ['Symbol', colors.bold(data.tokenMeta.symbol)],
      ['Address', colors.gray(address)],
      [
        'Total Supply',
        colors.yellow(
          formatNumber(data.token.supply / Math.pow(10, data.token.decimals))
        ),
      ],
      ['Decimals', data.token.decimals.toString()],
      ['Created', new Date(data.detectedAt).toLocaleString()]
    );

    console.log(tokenInfoTable.toString());

    // Display liquidity info
    console.log('\n' + colors.bold('Liquidity Information:'));
    console.log(
      `Total Market Liquidity: ${colors.green(
        '$' + formatNumber(data.totalMarketLiquidity)
      )}`
    );

    // Display top holders
    console.log('\n' + colors.bold('Top Token Holders:'));
    const holdersTable = new Table({
      head: [
        colors.cyan('Rank'),
        colors.cyan('Address'),
        colors.cyan('Amount'),
        colors.cyan('Percentage'),
      ],
      colWidths: [10, 45, 20, 15],
    });

    data.topHolders.slice(0, 10).forEach((holder, index) => {
      holdersTable.push([
        (index + 1).toString(),
        colors.gray(holder.address),
        formatNumber(holder.uiAmount),
        colors.yellow(holder.pct.toFixed(2) + '%'),
      ]);
    });

    console.log(holdersTable.toString());

    // Display market information
    if (data.markets.length > 0) {
      console.log('\n' + colors.bold('Market Information:'));
      console.log(`Exchange: ${colors.yellow(data.markets[0].marketType)}`);
      console.log(`Pair: ${colors.yellow(data.tokenMeta.symbol)}/SOL`);
      console.log(`LP Token: ${colors.gray(data.markets[0].mintLP)}`);
    }

    // Display LP token information
    if (data.markets[0] && data.markets[0].lp) {
      const lp = data.markets[0].lp;
      console.log('\n' + colors.bold('LP Token Information:'));
      console.log(
        `Total LP Providers: ${colors.yellow(data.totalLPProviders)}`
      );
      console.log(
        `LP Tokens Locked: ${colors.green(lp.lpLockedPct.toFixed(2) + '%')}`
      );
      console.log(
        `LP Locked USD Value: ${colors.green(
          '$' + formatNumber(lp.lpLockedUSD)
        )}`
      );
    }

    // Display verification status
    console.log('\n' + colors.bold('Verification Status:'));
    console.log(
      `Jupiter Verified: ${
        data.verification.jup_verified ? colors.green('Yes') : colors.red('No')
      }`
    );

    // Display social links
    if (data.verification.links && data.verification.links.length > 0) {
      console.log('\n' + colors.bold('Social Links:'));
      data.verification.links.forEach((link) => {
        console.log(
          `${colors.cyan(link.provider)}: ${colors.underline.blue(link.value)}`
        );
      });
    }

    // Calculate risk score
    const { riskScore, riskLevel } = calculateRiskScore(data);

    // Generate SVG banner
    const svgBanner = generateTokenBanner(data, riskScore, riskLevel);

    // Save SVG banner
    const svgPath = 'token_analysis_banner.svg';
    fs.writeFileSync(svgPath, svgBanner);
    console.log(`\nToken analysis banner saved as ${svgPath}`);

    // Convert SVG to PNG and save with token name
    // const pngPath = `${data.tokenMeta.name.replace(/\s+/g, '_')}_analysis.png`;
    // await convertSvgToPng(svgBanner, pngPath);

    // Additional insights
    console.log('\n' + colors.bold('Additional Insights:'));
    if (data.mintAuthority === null && data.freezeAuthority === null) {
      console.log(
        colors.green(
          '• Token contract is renounced (no mint or freeze authority)'
        )
      );
    } else {
      console.log(
        colors.yellow('• Token contract is not renounced. Be cautious.')
      );
    }

    if (data.transferFee.pct === 0) {
      console.log(colors.green('• No transfer fees'));
    } else {
      console.log(colors.yellow(`• Transfer fee: ${data.transferFee.pct}%`));
    }

    const age =
      (new Date() - new Date(data.detectedAt)) / (1000 * 60 * 60 * 24);
    if (age < 30) {
      console.log(
        colors.yellow(
          `• Token is relatively new (${age.toFixed(
            0
          )} days old). Exercise caution.`
        )
      );
    } else {
      console.log(
        colors.green(`• Token has been around for ${age.toFixed(0)} days.`)
      );
    }

    // Final recommendation
    console.log('\n' + colors.bold.underline('Final Recommendation:'));
    if (data.rugged) {
      console.log(
        colors.red.bold(
          'DANGER: This token has been flagged as rugged. Do not invest!'
        )
      );
    } else if (data.risks && data.risks.length > 0) {
      console.log(
        colors.yellow(
          'CAUTION: This token has some risk factors. Invest with extreme caution.'
        )
      );
    } else {
      console.log(
        colors.green(
          'This token appears to have passed basic safety checks. However, always do your own research before investing.'
        )
      );
    }

    // Display risk assessment in larger text at the end
    console.log('\n');
    // console.log(
    //   gradient.pastel.multiline(
    //     figlet.textSync('Risk Assessment', { horizontalLayout: 'full' })
    //   )
    // );
    // console.log(
    //   gradient.pastel.multiline(
    //     figlet.textSync(`Score: ${riskScore.toFixed(2)}%`, {
    //       horizontalLayout: 'full',
    //     })
    //   )
    // );

    if (Number(riskScore) > 60) {
      console.log(colors.bold(`Score: ${colors.red(riskScore.toFixed(2))}%`));
      console.log(colors.bold(`Risk Level: ${colors.red(riskLevel)}`));
    } else if (riskScore > 40) {
      console.log(
        colors.bold(`Score: ${colors.yellow(riskScore.toFixed(2))}%`)
      );
      console.log(colors.bold(`Risk Level: ${colors.yellow(riskLevel)}`));
    } else {
      console.log(colors.bold(`Score: ${colors.green(riskScore.toFixed(2))}%`));
      console.log(colors.bold(`Risk Level: ${colors.green(riskLevel)}`));
    }

    // console.log(
    //   gradient.pastel.multiline(
    //     figlet.textSync(`Level: ${riskLevel}`, { horizontalLayout: 'full' })
    //   )
    // );
  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(colors.red('Error:'), error.message);
  }

  rl.close();
}

// Start the program
console.log(
  gradient.fruit.multiline(
    figlet.textSync('Solana\nToken Analyzer', { horizontalLayout: 'full' })
  )
);

rl.question(colors.cyan('\nEnter Solana token address: '), (address) => {
  analyzeToken(address);
});
