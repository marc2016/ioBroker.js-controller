import * as path from 'path';
import fs from 'fs';
import { Extractor, ExtractorConfig, ExtractorResult } from '@microsoft/api-extractor';

const apiExtractorJsonPath: string = path.join(__dirname, 'api-extractor.json');

// Load and parse the api-extractor.json file
const extractorConfig: ExtractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath);

// Invoke API Extractor
const extractorResult: ExtractorResult = Extractor.invoke(extractorConfig, {
    // Equivalent to the "--local" command-line parameter
    localBuild: true,

    // Equivalent to the "--verbose" command-line parameter
    showVerboseMessages: true
});

if (extractorResult.succeeded) {
    // Remove references to @iobroker/types-dev
    const outputPath = extractorConfig.untrimmedFilePath;
    let content = fs.readFileSync(outputPath, 'utf8');
    const lines = content
        .split('\n')
        .filter(line => !(line.startsWith('/// <reference') && line.includes('@iobroker/types-dev')));
    content = lines.join('\n');
    fs.writeFileSync(outputPath, content);

    // Copy outputs from types-dev to here
    fs.copyFileSync(path.join(__dirname, '../types-dev/objects.d.ts'), path.join(__dirname, 'build/objects.d.ts'));
    fs.copyFileSync(path.join(__dirname, '../types-dev/index.d.ts'), path.join(__dirname, 'build/shared.d.ts'));
    fs.copyFileSync(path.join(__dirname, '../types-dev/config.d.ts'), path.join(__dirname, 'build/config.d.ts'));

    // Ensure that the generated types don't contain any references to @iobroker/*
    if (content.includes('@iobroker/')) {
        console.error('The generated types contain a reference to an @iobroker package. This is not allowed!');
        console.error('Make sure to put all types shared by controller and adapters into the types-dev package.');
        process.exit(1);
    }

    console.log(`API Extractor completed successfully`);
    process.exit(0);
} else {
    console.error(
        `API Extractor completed with ${extractorResult.errorCount} errors` +
            ` and ${extractorResult.warningCount} warnings`
    );
    process.exit(1);
}
