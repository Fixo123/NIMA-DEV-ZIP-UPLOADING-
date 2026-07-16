const { Octokit } = require('@octokit/rest');
const JSZip = require('jszip');

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'POST පමණක්' })
        };
    }

    try {
        const { zipBase64, zipName, repoName, extractFiles } = JSON.parse(event.body);
        
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const GITHUB_USER = process.env.GITHUB_USER;

        if (!GITHUB_TOKEN || !GITHUB_USER) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server Config Error: GITHUB_TOKEN or GITHUB_USER not set' 
                })
            };
        }

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        let repo;
        try {
            repo = await octokit.repos.createForAuthenticatedUser({
                name: repoName,
                description: `Auto-created from ${zipName} via Netlify`,
                private: false,
                auto_init: false
            });
        } catch (error) {
            if (error.status === 422) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: `"${repoName}" නමින් Repo එකක් දැනටමත් තියෙනවා` 
                    })
                };
            }
            throw error;
        }

        const repoUrl = repo.data.html_url;
        let filesUploaded = 0;

        if (extractFiles) {
            const zipBuffer = Buffer.from(zipBase64, 'base64');
            const zip = await JSZip.loadAsync(zipBuffer);
            
            const entries = Object.entries(zip.files);
            
            for (const [filename, file] of entries) {
                if (!file.dir) {
                    try {
                        const content = await file.async('base64');
                        await octokit.repos.createOrUpdateFileContents({
                            owner: GITHUB_USER,
                            repo: repoName,
                            path: filename,
                            message: `Add ${filename}`,
                            content: content,
                            branch: 'main'
                        });
                        filesUploaded++;
                    } catch (error) {
                        console.error(`Failed to upload ${filename}:`, error.message);
                    }
                }
            }
        } else {
            await octokit.repos.createOrUpdateFileContents({
                owner: GITHUB_USER,
                repo: repoName,
                path: zipName,
                message: `Add ${zipName}`,
                content: zipBase64,
                branch: 'main'
            });
            filesUploaded = 1;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                repoUrl: repoUrl,
                filesUploaded: filesUploaded,
                message: 'Repo එක හදලා ගොනු Upload කරා!'
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: error.message || 'Internal server error' 
            })
        };
    }
};
