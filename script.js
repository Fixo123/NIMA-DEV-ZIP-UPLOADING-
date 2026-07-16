let selectedFile = null;

document.getElementById('zipFile').addEventListener('change', function(e) {
    selectedFile = this.files[0];
    if (selectedFile) {
        document.getElementById('fileName').textContent = selectedFile.name;
        if (!document.getElementById('repoName').value) {
            document.getElementById('repoName').value = selectedFile.name.replace('.zip', '');
        }
    }
});

async function uploadAndCreate() {
    const file = selectedFile;
    const repoNameInput = document.getElementById('repoName');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');
    const progressDiv = document.getElementById('progress');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!file) {
        statusDiv.innerHTML = '⚠️ ZIP ගොනුවක් තෝරන්න';
        statusDiv.className = 'status error';
        return;
    }

    if (!file.name.endsWith('.zip')) {
        statusDiv.innerHTML = '⚠️ ZIP ගොනුවක් පමණක් තෝරන්න';
        statusDiv.className = 'status error';
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Processing...';
    statusDiv.className = 'status loading';
    statusDiv.innerHTML = '⏳ ZIP එක Process වෙමින්...';
    resultDiv.innerHTML = '';
    progressDiv.style.display = 'block';

    try {
        progressBar.style.width = '20%';
        progressText.textContent = '20% - File reading...';
        
        const base64Data = await readFileAsBase64(file);
        
        progressBar.style.width = '50%';
        progressText.textContent = '50% - Uploading to GitHub...';
        statusDiv.innerHTML = '⏳ GitHub එකට Upload වෙමින්...';

        const extract = document.getElementById('extractFiles').checked;
        const response = await fetch('/.netlify/functions/create-repo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                zipBase64: base64Data,
                zipName: file.name,
                repoName: repoNameInput.value || file.name.replace('.zip', ''),
                extractFiles: extract
            })
        });

        progressBar.style.width = '80%';
        progressText.textContent = '80% - Finalizing...';

        const data = await response.json();

        if (data.success) {
            progressBar.style.width = '100%';
            progressText.textContent = '100% - Done!';
            statusDiv.className = 'status success';
            statusDiv.innerHTML = '✅ සාර්ථකයි!';
            
            resultDiv.innerHTML = `
                🎉 Repo එක හදලා ඉවරයි!<br><br>
                <strong>Repo:</strong> <a href="${data.repoUrl}" target="_blank">${data.repoUrl}</a><br>
                <span style="color: #8b949e; font-size: 14px;">
                    📁 ${data.filesUploaded || 0} ගොනු Upload කරා
                </span>
            `;
        } else {
            throw new Error(data.error || 'Unknown error');
        }

    } catch (error) {
        statusDiv.className = 'status error';
        statusDiv.innerHTML = '❌ Error: ' + error.message;
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '🚀 Upload & Create Repo';
        setTimeout(() => {
            progressDiv.style.display = 'none';
        }, 3000);
    }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
          }
