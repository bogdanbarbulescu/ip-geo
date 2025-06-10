// IP Location Checker App - Enhanced with Map, ISP, Org, Flags
class IPLocationApp {
    constructor() {
        this.apiBase = 'https://freeipapi.com/api/json/';
        this.ipv4Regex = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        this.searchHistory = this.loadHistory();
        this.requestTimeout = 10000;
        this.map = null; // Leaflet map instance
        this.mapMarker = null; // Leaflet marker instance

        this.initializeElements();
        this.bindEvents();
        this.updateHistoryDisplay();
    }

    initializeElements() {
        this.ipInput = document.getElementById('ip-input');
        this.checkButton = document.getElementById('check-ip-btn');
        this.myIpButton = document.getElementById('my-ip-btn');
        this.errorMessage = document.getElementById('error-message');
        this.resultSection = document.getElementById('result-section');
        this.mapSection = document.getElementById('map-section');
        this.mapContainer = document.getElementById('map-container');
        this.mapAttribution = document.getElementById('map-attribution');
        this.historySection = document.getElementById('history-section');
        this.historyList = document.getElementById('history-list');
        this.historyEmptyState = document.querySelector('.history-empty-state');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');
        this.copyButton = document.getElementById('copy-results-btn');

        this.resultElements = {
            ip: document.getElementById('result-ip'),
            country: document.getElementById('result-country'),
            region: document.getElementById('result-region'),
            city: document.getElementById('result-city'),
            zip: document.getElementById('result-zip'),
            coordinates: document.getElementById('result-coordinates'),
            timezone: document.getElementById('result-timezone'),
            continent: document.getElementById('result-continent'),
            ipVersion: document.getElementById('result-ipVersion'),
            isp: document.getElementById('result-isp'),
            organization: document.getElementById('result-organization')
        };
    }

    bindEvents() {
        this.checkButton.addEventListener('click', () => this.handleCheckIP());
        this.myIpButton.addEventListener('click', () => this.handleMyIP());
        this.copyButton.addEventListener('click', () => this.handleCopyResults());
        this.ipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.handleCheckIP(); }
        });
        this.ipInput.addEventListener('input', () => this.clearError());
    }

    validateIP(ip) { return this.ipv4Regex.test(ip.trim()); }
    showError(message) { this.errorMessage.innerHTML = `<i class="fas fa-exclamation-triangle" aria-hidden="true"></i> ${message}`; }
    clearError() { this.errorMessage.innerHTML = ''; }

    showLoading() {
        this.loadingSpinner.classList.remove('hidden');
        this.checkButton.classList.add('loading');
        this.checkButton.disabled = true;
        this.myIpButton.disabled = true;
    }

    hideLoading() {
        this.loadingSpinner.classList.add('hidden');
        this.checkButton.classList.remove('loading');
        this.checkButton.disabled = false;
        this.myIpButton.disabled = false;
    }

    showToast(message, type = 'success') {
        this.toastMessage.textContent = message;
        this.toast.className = 'toast'; 
        this.toast.classList.add(type, 'show');
        setTimeout(() => this.toast.classList.remove('show'), 3000);
    }

    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal, headers: {'Accept': 'application/json', ...options.headers}});
            clearTimeout(timeoutId);
            return response;
        } catch (error) { clearTimeout(timeoutId); throw error; }
    }

    async fetchIPData(ip = '') {
        const url = ip ? `${this.apiBase}${ip}` : this.apiBase;
        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) {
                if (response.status === 429) throw new Error('Prea multe cereri. Încercați din nou într-un minut.');
                if (response.status === 404) throw new Error('Adresa IP nu a fost găsită sau este invalidă.');
                const errorText = await response.text().catch(() => 'Eroare necunoscută.');
                throw new Error(`Eroare server (${response.status}): ${errorText.substring(0,100)}`);
            }
            const data = await response.json();
            if (!data || typeof data !== 'object') throw new Error('Răspuns invalid de la server.');
            return data;
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('Cererea a expirat. Verificați conexiunea.');
            if (error.message.toLowerCase().includes('failed to fetch')) throw new Error('Eroare de rețea. Verificați conexiunea.');
            throw error;
        }
    }

    displayResults(data) {
        if (!data || (!data.ipAddress && !data.ip)) {
            this.showError('Nu s-au putut obține informații valide.');
            this.resultSection.classList.add('hidden'); this.resultSection.classList.remove('show');
            this.mapSection.classList.add('hidden'); this.mapSection.classList.remove('show');
            return;
        }

        const ipAddress = data.ipAddress || data.ip || '-';
        const countryName = data.countryName || '-';
        const countryCode = data.countryCode || '';
        const region = data.regionName || '-';
        const city = data.cityName || '-';
        const zipCode = data.zipCode || '-';
        const timeZone = data.timeZone || '-';
        const continent = data.continentName || data.continentCode || '-';
        const ipVersion = data.ipVersion ? `IPv${data.ipVersion}` : (ipAddress.includes(':') ? 'IPv6' : (ipAddress === '-' ? '-' : 'IPv4'));
        const isp = data.ispName || '-';
        const organization = data.organizationName || '-';
        const latitude = data.latitude;
        const longitude = data.longitude;

        this.resultElements.ip.textContent = ipAddress;
        
        // Country with Flag
        this.resultElements.country.innerHTML = ''; // Clear previous
        if (countryName !== '-') {
            if (countryCode) {
                const flagImg = document.createElement('img');
                flagImg.src = `https://flagcdn.com/h20/${countryCode.toLowerCase()}.png`;
                flagImg.alt = `Steag ${countryName}`;
                flagImg.classList.add('flag-icon');
                this.resultElements.country.appendChild(flagImg);
            }
            const countryText = document.createTextNode(countryName);
            this.resultElements.country.appendChild(countryText);
        } else {
            this.resultElements.country.textContent = '-';
        }

        this.resultElements.region.textContent = region;
        this.resultElements.city.textContent = city;
        this.resultElements.zip.textContent = zipCode;
        this.resultElements.timezone.textContent = timeZone;
        this.resultElements.continent.textContent = continent;
        this.resultElements.ipVersion.textContent = ipVersion;
        this.resultElements.isp.textContent = isp;
        this.resultElements.organization.textContent = organization;

        if (latitude && longitude) {
            this.resultElements.coordinates.textContent = `${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`;
            this.updateMap(latitude, longitude, city !== '-' ? city : ipAddress);
            this.mapSection.classList.remove('hidden');
            void this.mapSection.offsetWidth; this.mapSection.classList.add('show');
        } else {
            this.resultElements.coordinates.textContent = '-';
            this.mapSection.classList.add('hidden'); this.mapSection.classList.remove('show');
            if (this.map) { this.map.remove(); this.map = null; } // Clean up map if no coords
        }

        Object.values(this.resultElements).forEach(element => {
            if (element.id === 'result-country') { // Special handling for country due to HTML content
                 element.classList.toggle('empty', element.textContent.trim() === '-' || element.innerHTML.includes('>-<'));
            } else {
                element.classList.toggle('empty', element.textContent === '-');
            }
        });

        this.resultSection.classList.remove('hidden');
        void this.resultSection.offsetWidth; this.resultSection.classList.add('show');
        if (window.innerWidth < 768) this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        this.addToHistory({
            ip: ipAddress, countryName, countryCode, regionName: region, cityName: city, zipCode, timeZone,
            continentName: continent, ipVersion: data.ipVersion, ispName: isp, organizationName: organization,
            latitude, longitude, originalData: data
        });
    }

    updateMap(lat, lon, popupText = 'Locație IP') {
        const coordinates = [lat, lon];
        if (!this.map) {
            this.map = L.map(this.mapContainer).setView(coordinates, 10); // Zoom level 10
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
            this.mapAttribution.innerHTML = 'Hartă © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
            this.mapMarker = L.marker(coordinates).addTo(this.map);
        } else {
            this.map.setView(coordinates, 10);
            this.mapMarker.setLatLng(coordinates);
        }
        this.mapMarker.bindPopup(popupText).openPopup();
        // Invalidate size after section becomes visible to ensure proper rendering
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 300);
    }
    
    loadHistory() {
        try {
            const storedHistory = localStorage.getItem('ipSearchHistoryV2'); // V2 for new structure
            return storedHistory ? JSON.parse(storedHistory) : [];
        } catch (e) { console.error("Failed to load history:", e); return []; }
    }

    saveHistory() {
        try { localStorage.setItem('ipSearchHistoryV2', JSON.stringify(this.searchHistory)); }
        catch (e) { console.error("Failed to save history:", e); }
    }

    addToHistory(itemData) {
        this.searchHistory = this.searchHistory.filter(item => item.ip !== itemData.ip);
        this.searchHistory.unshift({
            ip: itemData.ip,
            location: this.formatLocationForHistory(itemData),
            timestamp: new Date().toISOString(),
            data: itemData.originalData
        });
        if (this.searchHistory.length > 10) this.searchHistory = this.searchHistory.slice(0, 10);
        this.saveHistory();
        this.updateHistoryDisplay();
    }

    formatLocationForHistory(data) {
        const parts = [];
        if (data.cityName && data.cityName !== '-') parts.push(data.cityName);
        if (data.regionName && data.regionName !== '-') parts.push(data.regionName);
        if (data.countryName && data.countryName !== '-') parts.push(data.countryName);
        return parts.join(', ') || 'Locație necunoscută';
    }

    updateHistoryDisplay() {
        const hasHistory = this.searchHistory.length > 0;
        this.historySection.classList.toggle('hidden', !hasHistory);
        this.historyEmptyState.classList.toggle('hidden', hasHistory);
        if (!hasHistory) { this.historyList.innerHTML = ''; return; }

        this.historyList.innerHTML = '';
        this.searchHistory.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.setAttribute('tabindex', '0'); li.setAttribute('role', 'button');
            li.innerHTML = `
                <div>
                    <div class="history-ip">${item.ip}</div>
                    <div class="history-location">${item.location}</div>
                </div>
                <small class="history-time">${this.formatTime(new Date(item.timestamp))}</small>
            `;
            const handleHistoryClick = () => {
                this.ipInput.value = item.ip; this.clearError(); this.displayResults(item.data);
            };
            li.addEventListener('click', handleHistoryClick);
            li.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHistoryClick(); }});
            this.historyList.appendChild(li);
        });
    }

    formatTime(date) {
        const now = new Date(); const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);
        if (diffMins < 1) return 'acum';
        if (diffMins < 60) return `acum ${diffMins} min.`;
        const diffHours = Math.round(diffMins / 60);
        if (diffHours < 24) return `acum ${diffHours} ore`;
        return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    async handleCheckIP() {
        const ip = this.ipInput.value.trim();
        if (!ip) { this.showError('Vă rugăm să introduceți o adresă IP.'); return; }
        if (!this.validateIP(ip)) { this.showError('Adresă IP invalidă (ex: 192.168.1.1).'); return; }
        this.clearError(); this.showLoading();
        this.resultSection.classList.add('hidden'); this.resultSection.classList.remove('show');
        this.mapSection.classList.add('hidden'); this.mapSection.classList.remove('show');

        try {
            const data = await this.fetchIPData(ip);
            this.displayResults(data);
            if (data && (data.ipAddress || data.ip)) this.showToast('Informații obținute cu succes!');
        } catch (error) {
            this.showError(error.message || 'A apărut o eroare.');
            console.error('Error fetching IP data:', error);
        } finally { this.hideLoading(); }
    }

    async handleMyIP() {
        this.clearError(); this.showLoading();
        this.resultSection.classList.add('hidden'); this.resultSection.classList.remove('show');
        this.mapSection.classList.add('hidden'); this.mapSection.classList.remove('show');

        try {
            let data;
            try { data = await this.fetchIPData(); } 
            catch (primaryApiError) {
                console.warn('Primary API for current IP failed, trying fallbacks:', primaryApiError.message);
                const currentIp = await this.getFallbackCurrentIP();
                if (currentIp) { this.ipInput.value = currentIp; data = await this.fetchIPData(currentIp); } 
                else { throw new Error('Nu s-a putut detecta IP-ul curent.'); }
            }
            if (data && (data.ipAddress || data.ip)) {
                this.ipInput.value = data.ipAddress || data.ip;
                this.displayResults(data);
                this.showToast('IP-ul tău curent a fost detectat!');
            } else { throw new Error('Nu s-au putut obține date valide pentru IP-ul curent.'); }
        } catch (error) {
            this.showError(error.message || 'Eroare la detectarea IP-ului curent.');
            console.error('Error fetching current IP:', error);
            this.showDemoData();
        } finally { this.hideLoading(); }
    }
    
    async getFallbackCurrentIP() {
        const fallbackAPIs = [ 'https://api.ipify.org?format=json', 'https://ipinfo.io/json', 'https://ipv4.seeip.org/json' ];
        for (const apiUrl of fallbackAPIs) {
            try {
                const response = await this.fetchWithTimeout(apiUrl, {cache: "no-store"});
                if (response.ok) { const data = await response.json(); if (data.ip) return data.ip; }
            } catch (error) { console.warn(`Fallback IP API ${apiUrl} failed:`, error.message); }
        }
        return null;
    }

    showDemoData() {
        const demoData = {
            ipAddress: '8.8.8.8', ip: '8.8.8.8', countryName: 'Statele Unite', countryCode: 'US',
            regionName: 'California', cityName: 'Mountain View', zipCode: '94043',
            timeZone: 'America/Los_Angeles', continentName: 'America de Nord', ipVersion: '4',
            ispName: 'Google LLC', organizationName: 'Google LLC',
            latitude: '37.4056', longitude: '-122.0775'
        };
        this.ipInput.value = demoData.ipAddress;
        this.displayResults(demoData);
        this.showToast('Se afișează date demo. Eroare la detectarea IP-ului.', 'info');
    }

    async handleCopyResults() {
        if (!this.resultElements.ip.textContent || this.resultElements.ip.textContent === '-') {
            this.showToast('Nu există rezultate de copiat.', 'error'); return;
        }
        const resultText = this.formatResultsForCopy();
        const originalIconHTML = this.copyButton.innerHTML;
        const copiedIconHTML = '<i class="fas fa-check" aria-hidden="true"></i> <span class="sr-only">Copiat</span>';
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(resultText);
            else this.fallbackCopyText(resultText);
            this.copyButton.innerHTML = copiedIconHTML; this.copyButton.classList.add('copied');
            this.showToast('Rezultatele au fost copiate!');
            setTimeout(() => { this.copyButton.innerHTML = originalIconHTML; this.copyButton.classList.remove('copied'); }, 2000);
        } catch (error) {
            console.error('Copy failed:', error); this.showToast('Copierea a eșuat.', 'error');
            this.copyButton.innerHTML = originalIconHTML; this.copyButton.classList.remove('copied');
        }
    }

    formatResultsForCopy() {
        return [
            `IP: ${this.resultElements.ip.textContent}`,
            `Țară: ${this.resultElements.country.textContent.trim()}`, // Trim in case of flag image spacing
            `Regiune: ${this.resultElements.region.textContent}`,
            `Oraș: ${this.resultElements.city.textContent}`,
            `Cod Poștal: ${this.resultElements.zip.textContent}`,
            `Coordonate: ${this.resultElements.coordinates.textContent}`,
            `Fus Orar: ${this.resultElements.timezone.textContent}`,
            `Continent: ${this.resultElements.continent.textContent}`,
            `Versiune IP: ${this.resultElements.ipVersion.textContent}`,
            `ISP: ${this.resultElements.isp.textContent}`,
            `Organizație: ${this.resultElements.organization.textContent}`
        ].join('\n');
    }

    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text; textArea.style.position = 'fixed'; 
        textArea.style.opacity = '0'; textArea.style.pointerEvents = 'none';
        document.body.appendChild(textArea); textArea.focus(); textArea.select();
        let success = false;
        try { success = document.execCommand('copy'); }
        catch (err) { console.error('Fallback copy failed:', err); throw new Error('Fallback copy failed'); }
        document.body.removeChild(textArea);
        if (!success) throw new Error('Fallback copy command unsuccessful.');
    }
}

document.addEventListener('DOMContentLoaded', () => new IPLocationApp());
