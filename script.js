// Core Logic using BigInt

let currentNormalValue = 0n;
let currentBitwidth = 8;

const bitwidthInput = document.getElementById('bitwidth-input');
const clearBtn = document.getElementById('clear-btn');

// Input fields
const inputs = {
    norm: {
        2: document.getElementById('norm-bin'),
        10: document.getElementById('norm-dec'),
        16: document.getElementById('norm-hex')
    },
    gray: {
        2: document.getElementById('gray-bin'),
        10: document.getElementById('gray-dec'),
        16: document.getElementById('gray-hex')
    }
};

// Math / Conversion
function getMask(bits) {
    return (1n << BigInt(bits)) - 1n;
}

function normalToGray(normal) {
    return normal ^ (normal >> 1n);
}

function grayToNormal(gray) {
    let normal = 0n;
    for (let temp = gray; temp > 0n; temp >>= 1n) {
        normal ^= temp;
    }
    return normal;
}

// Update all UI fields based on currentNormalValue and currentBitwidth
function updateUI(sourceInput = null) {
    const mask = getMask(currentBitwidth);
    const normalMasked = currentNormalValue & mask;
    const grayMasked = normalToGray(normalMasked);

    const hexPad = Math.ceil(currentBitwidth / 4);
    const binPad = currentBitwidth;

    // Helper to format string
    const formatValue = (val, radix) => {
        let str = val.toString(radix);
        if (radix === 2) {
            let padded = str.padStart(binPad, '0');
            let res = '';
            for (let i = padded.length - 1; i >= 0; i--) {
                res = padded[i] + res;
                if ((padded.length - i) % 4 === 0 && i !== 0) {
                    res = ' ' + res;
                }
            }
            return res;
        } else if (radix === 16) {
            let padded = str.padStart(hexPad, '0').toUpperCase();
            let res = '';
            for (let i = padded.length - 1; i >= 0; i--) {
                res = padded[i] + res;
                if ((padded.length - i) % 4 === 0 && i !== 0) {
                    res = ' ' + res;
                }
            }
            return res;
        } else if (radix === 10) {
            let res = '';
            for (let i = str.length - 1; i >= 0; i--) {
                res = str[i] + res;
                if ((str.length - i) % 3 === 0 && i !== 0) {
                    res = ' ' + res;
                }
            }
            return res;
        }
        return str;
    };

    // Update Normal
    if (sourceInput !== inputs.norm[2]) inputs.norm[2].value = formatValue(normalMasked, 2);
    if (sourceInput !== inputs.norm[10]) inputs.norm[10].value = formatValue(normalMasked, 10);
    if (sourceInput !== inputs.norm[16]) inputs.norm[16].value = formatValue(normalMasked, 16);

    // Update Gray
    if (sourceInput !== inputs.gray[2]) inputs.gray[2].value = formatValue(grayMasked, 2);
    if (sourceInput !== inputs.gray[10]) inputs.gray[10].value = formatValue(grayMasked, 10);
    if (sourceInput !== inputs.gray[16]) inputs.gray[16].value = formatValue(grayMasked, 16);
}

function modifyValue(element, delta) {
    if (element.id === 'bitwidth-input') {
        let newBitwidth = parseInt(element.value) + delta;
        if (isNaN(newBitwidth)) newBitwidth = 8;
        if (newBitwidth < 1) newBitwidth = 1;
        element.value = newBitwidth;
        element.dispatchEvent(new Event('input'));
        return;
    }

    const radix = parseInt(element.getAttribute('data-radix'));
    const type = element.getAttribute('data-type');
    
    let valStr = element.value.replace(/\s+/g, '');
    if (valStr === '') valStr = '0';
    let parsedVal = 0n;
    try {
        if (radix === 2) parsedVal = BigInt('0b' + valStr);
        else if (radix === 16) parsedVal = BigInt('0x' + valStr);
        else parsedVal = BigInt(valStr);
    } catch(e) { return; }
    
    let newVal = parsedVal + BigInt(delta);
    const mask = getMask(currentBitwidth);
    newVal = newVal & mask; // Wraps around at max/min using bitmask
    
    if (type === 'norm') {
        currentNormalValue = newVal;
    } else {
        currentNormalValue = grayToNormal(newVal);
    }
    updateUI();
}

// Validation & Key Blocking
function isAllowedKey(e, radix) {
    // Allow control keys: Backspace, Tab, Delete, Arrows, Home, End, Ctrl+C, Ctrl+V, Ctrl+A, etc.
    if (e.ctrlKey || e.metaKey || e.altKey) return true;
    if (e.key.length > 1) return true; // Nav keys, backspace, etc.
    
    const char = e.key;
    if (radix === 2) {
        return /^[01\s]$/.test(char);
    } else if (radix === 10) {
        return /^[0-9\s]$/.test(char);
    } else if (radix === 16) {
        return /^[0-9a-fA-F\s]$/.test(char);
    }
    return false;
}

function attachInputHandlers(element, type, radix) {
    // Block keystrokes
    element.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            modifyValue(element, 1);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            modifyValue(element, -1);
            return;
        }
        if (!isAllowedKey(e, radix)) {
            e.preventDefault();
        }
    });

    // Handle parsing on input
    element.addEventListener('input', (e) => {
        let valStr = e.target.value.replace(/\s+/g, '');
        if (valStr === '') return; // DO NOT update state if empty
        
        try {
            let parsedVal;
            if (radix === 2) {
                parsedVal = BigInt('0b' + valStr);
            } else if (radix === 16) {
                parsedVal = BigInt('0x' + valStr);
            } else {
                parsedVal = BigInt(valStr);
            }

            // Mask immediately in case user entered too big number
            const mask = getMask(currentBitwidth);
            parsedVal = parsedVal & mask;

            if (type === 'norm') {
                currentNormalValue = parsedVal;
            } else {
                currentNormalValue = grayToNormal(parsedVal);
            }
            
            updateUI(element);
        } catch (err) {
            // invalid format entered (e.g. paste), just ignore calculation update
        }
    });
    
    // Optional: when leaving input, reformat it with padding
    element.addEventListener('blur', () => {
        updateUI();
    });
}

// Setup Event Listeners
Object.keys(inputs).forEach(type => {
    Object.keys(inputs[type]).forEach(radixStr => {
        const radix = parseInt(radixStr);
        attachInputHandlers(inputs[type][radixStr], type, radix);
    });
});

document.querySelectorAll('.spin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        const element = document.getElementById(targetId);
        if (element) {
            const delta = btn.classList.contains('up') ? 1 : -1;
            modifyValue(element, delta);
        }
    });
});

bitwidthInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        modifyValue(bitwidthInput, 1);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        modifyValue(bitwidthInput, -1);
    } else if (!isAllowedKey(e, 10)) {
        e.preventDefault();
    }
});

bitwidthInput.addEventListener('blur', () => {
    bitwidthInput.value = currentBitwidth;
});

bitwidthInput.addEventListener('input', (e) => {
    let newBitwidth = parseInt(e.target.value);
    if (!isNaN(newBitwidth) && newBitwidth > 0) {
        currentBitwidth = newBitwidth;
        // Truncate existing value to new bitwidth
        const mask = getMask(currentBitwidth);
        currentNormalValue = currentNormalValue & mask;
        updateUI();
    }
});

clearBtn.addEventListener('click', () => {
    currentNormalValue = 0n;
    currentBitwidth = 8;
    bitwidthInput.value = 8;
    updateUI();
});

// Initial update
updateUI();
