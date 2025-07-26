// Import modules
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Create camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create renderer
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance",
    stencil: false
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputEncoding = THREE.sRGBEncoding;

// Ensure the container exists
const container = document.getElementById('scene-container');
if (!container) {
    console.error('Scene container not found!');
    throw new Error('Scene container not found!');
}
container.appendChild(renderer.domElement);

// Setup post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Add bloom effect
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.4,    // Strength
    0.4,    // Radius
    0.65    // Threshold
);
composer.addPass(bloomPass);

// Add gamma correction
const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
composer.addPass(gammaCorrectionPass);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x050505, 0.02); // Ultra dark ambient light
scene.add(ambientLight);

// Create a glowing bulb effect
const bulbGeometry = new THREE.SphereGeometry(0.034, 16, 16); // Reduced by 20% (0.043 -> 0.034)
const bulbMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff2e6,
    transparent: true,
    opacity: 0.9
});
const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
// Position moved 3cm back (Z: 0.05 -> 0.08)
bulb.position.set(0.80, 1.15, 0.08);
scene.add(bulb);

// Desk lamp lighting (positioned based on lamp_10 coordinates)
const deskLamp = new THREE.SpotLight(0xfff2e6, 0.8, 6.8, Math.PI / 8.5, 0.2, 1.8); // Reduced intensity
deskLamp.position.copy(bulb.position);
deskLamp.target.position.set(0.1, 1.25, 0.08);
deskLamp.castShadow = true;
deskLamp.shadow.mapSize.width = 2048;
deskLamp.shadow.mapSize.height = 2048;
deskLamp.shadow.camera.near = 0.1;
deskLamp.shadow.camera.far = 10;
deskLamp.shadow.bias = -0.0001;
deskLamp.shadow.radius = 1.7;
scene.add(deskLamp);
scene.add(deskLamp.target);

// Additional desk lamp effects with very low intensity for cinematic look
const bulbLight = new THREE.PointLight(0xfff2e6, 0.3, 1.5); // Very reduced intensity
bulbLight.position.copy(bulb.position);
scene.add(bulbLight);

const lampGlow = new THREE.PointLight(0xfff2e6, 0.1, 2.5); // Minimal glow
lampGlow.position.copy(bulb.position);
scene.add(lampGlow);

const volumetricLight = new THREE.SpotLight(0xfff2e6, 0.03, 4, Math.PI / 6, 0.3, 2); // Almost invisible
volumetricLight.position.copy(bulb.position);
volumetricLight.target.position.set(0.1, 1.25, 0.08);
scene.add(volumetricLight);
scene.add(volumetricLight.target);

// OrbitControls setup
let controls = new OrbitControls(camera, renderer.domElement);

// Camera setup function
function setupCamera() {
    // Raise camera by another 20cm (Y: 1.7 -> 1.9) for even better PC screen visibility
    camera.position.set(-1.5, 1.9, 0.8); // Raised camera by 20cm more
    camera.lookAt(new THREE.Vector3(0.2, 1.3, -0.3)); // Looking towards the desk area

    controls.dispose(); // Remove old controls
    controls = new OrbitControls(camera, renderer.domElement); // Recreate controls

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false; // Disable panning
    controls.enableZoom = false; // Disable zoom
    controls.enablePan = false; // Disable panning

    controls.target.set(0.2, 1.3, -0.3); // Set target to match lookAt

    // Restrict movement to only look around (rotate camera)
    controls.minDistance = 2.0; // Fix distance
    controls.maxDistance = 2.0; // Fix distance
    controls.minPolarAngle = Math.PI / 3; // Limit vertical look (60 degrees)
    controls.maxPolarAngle = Math.PI / 2; // Limit vertical look (90 degrees)
    controls.minAzimuthAngle = -Math.PI / 6; // Limit horizontal look (-30 degrees)
    controls.maxAzimuthAngle = Math.PI / 6; // Limit horizontal look (+30 degrees)

    controls.update();
}

// Initial camera setup
setupCamera();

// Setup raycaster for mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let papers = null;
let originalPapersMaterial = null;

// Load the model
const mainLoader = new GLTFLoader();
// Loading screen management
const loadingScreen = document.querySelector('.loading-screen');
const loadingStartTime = Date.now();
const LOADING_DURATION = 3000; // 3 seconds

let modelsLoaded = false;

// Audio is now handled inline in HTML

// Global audio context for sound effects
let audioContext = null;
let audioInitialized = false;

// Initialize audio context
function initializeAudioContext() {
    if (!audioInitialized) {
        try {
            // Create audio context if it doesn't exist
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('🔊 Audio context resumed');
                    audioInitialized = true;
                });
            } else {
                audioInitialized = true;
            }
        } catch (error) {
            console.error('❌ Audio context initialization failed:', error);
        }
    }
}

// Paper sound effect function
function playPaperSound(volume = 0.7) {
    console.log('🔊 Playing paper sound...');
    
    // Initialize audio context first
    initializeAudioContext();
    
    const paperSound = document.getElementById('paper-sound');
    if (paperSound) {
        // Stop any currently playing sound and reset
        paperSound.pause();
        paperSound.currentTime = 0;
        paperSound.volume = volume;
        
        console.log('📄 Paper sound playing at volume:', volume);
        
        paperSound.play().then(() => {
            console.log('✅ Paper sound played successfully');
        }).catch(e => {
            console.error('❌ Paper sound failed:', e.name, e.message);
        });
    } else {
        console.error('❌ Paper sound element not found');
    }
}

// Glass sound effect function
function playGlassSound(volume = 0.6) {
    console.log('🔊 Playing glass sound...');
    
    // Initialize audio context first
    initializeAudioContext();
    
    const glassSound = document.getElementById('glass-sound');
    if (glassSound) {
        // Stop any currently playing sound and reset
        glassSound.pause();
        glassSound.currentTime = 0;
        glassSound.volume = volume;
        
        console.log('🪞 Glass sound playing at volume:', volume);
        
        glassSound.play().then(() => {
            console.log('✅ Glass sound played successfully');
        }).catch(e => {
            console.error('❌ Glass sound failed:', e.name, e.message);
        });
    } else {
        console.error('❌ Glass sound element not found');
    }
}

// Typewriter sound effect function
function playTypewriteSound(volume = 0.5) {
    console.log('🔊 Playing typewriter sound...');
    
    // Initialize audio context first
    initializeAudioContext();
    
    const typewriteSound = document.getElementById('typewrite-sound');
    if (typewriteSound) {
        // Stop any currently playing sound and reset
        typewriteSound.pause();
        typewriteSound.currentTime = 0;
        typewriteSound.volume = volume;
        
        console.log('⌨️ Typewriter sound playing at volume:', volume);
        
        typewriteSound.play().then(() => {
            console.log('✅ Typewriter sound played successfully');
        }).catch(e => {
            console.error('❌ Typewriter sound failed:', e.name, e.message);
        });
    } else {
        console.error('❌ Typewriter sound element not found');
    }
}

function hideLoadingScreen() {
    const elapsedTime = Date.now() - loadingStartTime;
    const remainingTime = Math.max(0, LOADING_DURATION - elapsedTime);
    
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }, remainingTime);
}

function onModelsLoaded() {
    modelsLoaded = true;
    hideLoadingScreen();
}

// Load main scene
mainLoader.load(
    '3dmodel/scene.gltf',
    function(gltf) {
    // Reduce grey commode size by 20%
    gltf.scene.traverse(function(node) {
        if (node.isMesh) {
            // Identify and scale down the grey commode
            if (node.name && node.name.toLowerCase().includes('commode')) {
                    node.scale.set(0.64, 0.64, 0.64);
            }
            
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material) {
                node.material.roughness = 0.8;
                node.material.metalness = 0.1;
                node.material.envMapIntensity = 0.5;
            }
            // Store reference to papers object
            if (node.name === 'Object_8' || node.parent?.name === 'papers_3') {
                papers = node;
                // Clone the material for hover effect
                originalPapersMaterial = node.material.clone();
                node.material = node.material.clone();
            }
        }
    });

    scene.add(gltf.scene);
        console.log('Main scene loaded successfully');

        onModelsLoaded(); // Call the new function

        // Now load the Mirror model
    const mirrorLoader = new GLTFLoader();
        mirrorLoader.load(
            'mirror/scene.gltf',
            function(mirrorGltf) {
                        mirrorGltf.scene.position.set(-1.1, 2.17, -2.2);
        mirrorGltf.scene.scale.set(0.32, 0.32, 0.32);
        mirrorGltf.scene.rotation.y = (3 * Math.PI) / 2 + (Math.PI / 4) + (Math.PI / 12) + (Math.PI / 12) + (Math.PI / 12) + (5 * Math.PI / 180) - (2 * Math.PI / 180); // +5 degrees right, -2 degrees left = +3 degrees total
        
        // Store reference to mirror
        mirrorObject = mirrorGltf.scene;
        
        // Create a single material for all mirror parts
        const mirrorMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc, // Light gray
            emissive: 0x000000, // No glow
            roughness: 0.1,
            metalness: 0.9,
            envMapIntensity: 1.0
        });
        
        // Apply the same material to all parts and set up for hover
        mirrorGltf.scene.traverse(function(node) {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                node.userData = { isMirror: true };
                // Use the same material instance for all parts
                node.material = mirrorMaterial;
            }
        });
        
        // Store material reference for hover effect
        mirrorGltf.scene.userData.material = mirrorMaterial;
        
                const mirrorLight = new THREE.PointLight(0xff7f50, 0.4, 2);
                mirrorLight.position.set(-1.1, 2.4, -2.2);
                mirrorLight.castShadow = false;
        scene.add(mirrorLight);
        
        scene.add(mirrorGltf.scene);
                console.log('Mirror loaded successfully');
            },
            undefined,
            function(error) {
                console.error('Error loading mirror:', error);
                if (loadingScreen) {
                    loadingScreen.textContent = 'Error loading mirror model';
                }
            }
        );

        console.log('🔧 ABOUT TO START TYPEWRITER LOADING...');
        // Load the Typewriter model independently
        console.log('🔧 STARTING TYPEWRITER LOADING...');
        const typewriterLoader = new GLTFLoader();
        typewriterLoader.load(
            'typewriter/scene.gltf',
            function(typewriterGltf) {
                console.log('✅ TYPEWRITER GLTF LOADED SUCCESSFULLY!');
                            // Position the typewriter on the desk (adjusted position and rotation)
            typewriterGltf.scene.position.set(1.15, 1.20, -1.63); // Moved back 3cm more (Z: -1.60->-1.63)
            typewriterGltf.scene.scale.set(15.0, 15.0, 15.0); // Size 15
            typewriterGltf.scene.rotation.y = (Math.PI * 60) / 120; // 60 degrees
                
                // Store reference to typewriter
                typewriterObject = typewriterGltf.scene;
                
                // Create a single material for all typewriter parts
                const typewriterMaterial = new THREE.MeshStandardMaterial({
                    color: 0x444444, // Dark gray
                    emissive: 0x000000, // No glow
                    roughness: 0.5,
                    metalness: 0.8,
                    envMapIntensity: 1.0
                });
                
                // Apply the same material to all parts and set up for hover
                typewriterGltf.scene.traverse(function(node) {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        node.userData = { isTypewriter: true };
                        // Use the same material instance for all parts
                        node.material = typewriterMaterial;
                    }
                });
                
                // Store material reference for hover effect
                typewriterGltf.scene.userData.material = typewriterMaterial;
                
                // Add very subtle orange lighting like mirror
                const typewriterLight = new THREE.PointLight(0xff7f50, 0.075, 2.0); // Reduced intensity by half (0.15->0.075)
                typewriterLight.position.copy(typewriterGltf.scene.position);
                typewriterLight.position.y += 0.2;
                typewriterLight.castShadow = true;
                scene.add(typewriterLight);
                
                // Add very subtle orange ambient light
                const ambientLight = new THREE.AmbientLight(0xff7f50, 0.025); // Reduced intensity by half (0.05->0.025)
                scene.add(ambientLight);
                
                scene.add(typewriterGltf.scene);
                console.log('Typewriter loaded successfully and should be VERY visible!');
            },
            function(progress) {
                console.log('📊 Typewriter loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            function(error) {
                console.error('❌ ERROR LOADING TYPEWRITER:', error);
                console.error('❌ Error details:', error.message, error.stack);
            }
        );
        
        // Start animation after main scene is loaded
    animate();
    },
    undefined,
    function(error) {
        console.error('Error loading main scene:', error);
        if (loadingScreen) {
            loadingScreen.textContent = 'Error loading main scene';
        }
    }
);

let targetCameraPosition = new THREE.Vector3();
let initialCameraPosition = new THREE.Vector3();

// Global variables for interactive objects
let mirrorObject = null;
let typewriterObject = null;

// Mouse move handler
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true);

    // Reset all hover effects
    scene.traverse(function(child) {
        if (child.isMesh && child.material) {
            // Reset papers
            if (child.name === 'papers_3' || child.name === 'Object_8' || child.parent?.name === 'papers_3') {
                child.material.emissive = new THREE.Color(0x000000);
            }
        }
    });
    
    // Reset typewriter (using shared material)
    if (typewriterObject && typewriterObject.userData.material) {
        typewriterObject.userData.material.emissive.setHex(0x000000);
    }
    
    // Reset mirror (using shared material)
    if (mirrorObject && mirrorObject.userData.material) {
        mirrorObject.userData.material.emissive.setHex(0x000000);
    }

    // Reset cursor
    document.body.style.cursor = 'default';

    if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
            const intersect = intersects[i];
            const object = intersect.object;
            
            // Hover effect for papers_3 (check both Object_8 and papers_3 like in model loading)
            if (object.name === 'Object_8' || object.parent?.name === 'papers_3' || object.name === 'papers_3') {
                object.material.emissive = new THREE.Color(0x666666);
                document.body.style.cursor = 'pointer';
                return; // Exit early to avoid multiple effects
            }
            
            // Hover effect for mirror (global effect)
            if (object.userData && object.userData.isMirror && mirrorObject.userData.material) {
                mirrorObject.userData.material.emissive.setHex(0x444444);
                document.body.style.cursor = 'pointer';
                return; // Exit early to avoid multiple effects
            }
            
            // Hover effect for typewriter (global effect)
            if (object.userData && object.userData.isTypewriter && typewriterObject.userData.material) {
                typewriterObject.userData.material.emissive.setHex(0x666666);
                document.body.style.cursor = 'pointer';
                return; // Exit early to avoid multiple effects
            }
        }
    }

    // Calculate camera movement (reduced range and smoother)
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    targetCameraPosition.copy(initialCameraPosition);
    targetCameraPosition.x += mouseX * 0.5; // Reduced from 2 to 0.5
    targetCameraPosition.y += mouseY * 0.3; // Reduced from 1 to 0.3
}

// Documentation menu function
function showDocumentationMenu() {
    // Remove any existing menus
    const existingMenu = document.getElementById('docs-menu');
    const existingSocialMenu = document.getElementById('social-menu');
    if (existingMenu) existingMenu.remove();
    if (existingSocialMenu) existingSocialMenu.remove();

    // Create menu container
    const menu = document.createElement('div');
    menu.id = 'docs-menu';
    menu.className = 'visible';

    // Create newspaper
    const newspaper = document.createElement('div');
    newspaper.className = 'newspaper';

    // Add content
    newspaper.innerHTML = `
        <div class="newspaper-header">
            <h1 class="newspaper-title">BlackMirror OS</h1>
            <div class="newspaper-subtitle">System Documentation</div>
            <div class="quote">"When systems are designed to hide, you need one designed to see."</div>
        </div>
        <div class="newspaper-content">
            <div class="section">
                <h2 class="section-title">System Overview</h2>
                <div class="section-text">
                    BlackMirror OS is built for a world where access to information is no longer free. It's filtered, 
                    ranked, throttled and sometimes outright erased.
                </div>
                <div class="section-text">
                    Most search engines give you curated results. Most AI tools won't answer sensitive questions. 
                    Social platforms shape your feed and tell you they're protecting you.
                </div>
                <div class="highlight-box">
                    But sometimes, you're not looking for safe answers.<br>
                    You're looking for the truth, no matter where it's buried.
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">Core Architecture</h2>
                <div class="section-text">
                    The system operates through three integrated components:
                </div>
                <ul class="feature-list">
                    <li><strong>AI Core</strong>: Processes natural language queries and runs on local or distributed networks</li>
                    <li><strong>Access Layer</strong>: Connects to surface web, deep web and dark web networks</li>
                    <li><strong>Privacy Engine</strong>: Ensures complete anonymity through encrypted containers</li>
                </ul>
                <div class="section-text">
                    Each component is designed for maximum autonomy. No cloud accounts. No registration. 
                    No central server. The system is fully decentralized.
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">Network Access</h2>
                <div class="section-text">
                    BlackMirror OS reaches across multiple network layers:
                </div>
                <ul class="feature-list">
                    <li><strong>Surface Web</strong>: Public internet and indexed content</li>
                    <li><strong>Deep Web</strong>: Non-indexed databases and hidden services</li>
                    <li><strong>Dark Web</strong>: Tor, I2P and Freenet networks</li>
                </ul>
                <div class="section-text">
                    The system automatically routes queries through appropriate networks while maintaining 
                    complete anonymity.
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">AI Interface</h2>
                <div class="section-text">
                    The embedded AI agent processes complex queries without commercial restrictions. It can:
                </div>
                <ul class="feature-list">
                    <li>Analyze darknet market activity and vendor patterns</li>
                    <li>Monitor exploit forums and emerging threats</li>
                    <li>Track censored content and leaked documents</li>
                    <li>Investigate digital surveillance methods</li>
                </ul>
                <div class="highlight-box">
                    It doesn't track you.<br>
                    It doesn't remember you.<br>
                    It doesn't ask why you're asking.
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">Professional Usage</h2>
                <div class="section-text">
                    BlackMirror OS is designed for professionals working with sensitive information:
                </div>
                <ul class="feature-list">
                    <li><strong>Security Analysts</strong>: Threat intelligence and exploit monitoring</li>
                    <li><strong>Investigators</strong>: Digital forensics and pattern analysis</li>
                    <li><strong>Journalists</strong>: Access to censored material and sources</li>
                    <li><strong>Researchers</strong>: Deep analysis beyond surface narratives</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Legal Framework</h2>
                <div class="section-text">
                    BlackMirror OS is legal to operate but requires responsible use:
                </div>
                <div class="highlight-box warning-text">
                    The system provides access. You provide intent.<br>
                    You are the human in the loop and solely accountable for your actions.
                </div>
                <div class="section-text">
                    This isn't a license to break laws. It's a tool for professionals who understand that 
                    <strong>access to information</strong> and <strong>abuse of information</strong> are fundamentally different.
                </div>
            </div>
        </div>
    `;

    menu.appendChild(newspaper);

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close');
    menu.appendChild(closeButton);

    // Add to document
    document.body.appendChild(menu);

    // Handle close button
    closeButton.addEventListener('click', () => {
        menu.remove();
        resetCameraToBase();
    });
}

// Typewriter menu function
function showTypewriterMenu() {
    // Remove any existing menus
    const existingMenu = document.getElementById('docs-menu');
    const existingSocialMenu = document.getElementById('social-menu');
    const existingTypewriterMenu = document.getElementById('typewriter-menu');
    if (existingMenu) existingMenu.remove();
    if (existingSocialMenu) existingSocialMenu.remove();
    if (existingTypewriterMenu) existingTypewriterMenu.remove();

    // Create typewriter menu
    const typewriterMenu = document.createElement('div');
    typewriterMenu.id = 'typewriter-menu';
    typewriterMenu.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const typewriterPaper = document.createElement('div');
    typewriterPaper.style.cssText = `
        width: 90%;
        max-width: 800px;
        height: 85vh;
        background: #f4e4bc;
        position: relative;
        display: flex;
        flex-direction: column;
        padding: 40px;
        box-sizing: border-box;
        border: 2px solid rgba(20, 20, 20, 0.5);
        box-shadow: 
            inset 0 0 50px rgba(20, 20, 20, 0.2),
            0 0 30px rgba(0, 0, 0, 0.4);
        background-image: linear-gradient(45deg, #f4e4bc 0%, #f0d998 100%);
        font-family: 'Courier New', monospace;
        overflow-y: auto;
    `;

    const typewriterHeader = document.createElement('div');
    typewriterHeader.style.cssText = `
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid rgba(20, 20, 20, 0.3);
        padding-bottom: 20px;
    `;
    typewriterHeader.innerHTML = `
        <h1 style="font-family: 'Times New Roman', serif; font-size: 3em; color: #1a1a1a; margin: 0;">BlackMirror LLM</h1>
        <p style="font-style: italic; color: #1a1a1a; font-size: 1.2em; margin-top: 10px;">Initializing system...</p>
    `;

    const typewriterContent = document.createElement('div');
    typewriterContent.style.cssText = `
        width: 100%;
        height: 400px;
        font-family: 'Courier New', monospace;
        font-size: 16px;
        line-height: 1.8;
        background: transparent;
        border: none;
        outline: none;
        color: #1a1a1a;
        letter-spacing: 1px;
        white-space: pre-wrap;
        overflow-y: auto;
    `;
    
    const text = "BlackMirror LLM - The Future of AI Interaction\n\nAccess to our advanced language model will require $BMOS tokens:\n\n- Standard Queries: 0.5 $BMOS\n- Advanced Analysis: 10 $BMOS\n\nUnlock the power of truly autonomous AI with BlackMirror LLM.\nLaunch date to be announced.";
    typewriterContent.textContent = '';
    
    // Typing animation function
    let charIndex = 0;
    function typeNextChar() {
        if (charIndex < text.length) {
            typewriterContent.textContent += text[charIndex];
            charIndex++;
            
            // Play typewriter sound every 3 characters
            if (charIndex % 3 === 0) {
                playTypewriteSound(0.2);
            }
            
            // Random delay between 20ms and 65ms for even faster typing (2.25x speed)
            const delay = Math.random() * 45 + 20;
            setTimeout(typeNextChar, delay);
        }
    }
    
    // Start typing animation after a short delay
    setTimeout(typeNextChar, 500);

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: rgba(244, 228, 188, 0.9);
        border: 2px solid rgba(139, 69, 19, 0.5);
        color: #3d2914;
        font-size: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    `;
    closeButton.addEventListener('click', () => {
        typewriterMenu.remove();
        startReturnAnimation();
    });

    typewriterPaper.appendChild(typewriterHeader);
    typewriterPaper.appendChild(typewriterContent);
    typewriterPaper.appendChild(closeButton);
    typewriterMenu.appendChild(typewriterPaper);
    document.body.appendChild(typewriterMenu);

    // Focus on textarea
    setTimeout(() => typewriterTextarea.focus(), 100);
}

// Social menu function
function showSocialMenu() {
    // Remove any existing menus
    const existingMenu = document.getElementById('social-menu');
    const existingDocsMenu = document.getElementById('docs-menu');
    if (existingMenu) existingMenu.remove();
    if (existingDocsMenu) existingDocsMenu.remove();

    // Create menu container
    const menu = document.createElement('div');
    menu.id = 'social-menu';
    menu.className = 'visible';

    // Create social mirror content
    const socialMirror = document.createElement('div');
    socialMirror.className = 'social-mirror';

    // Add content
    socialMirror.innerHTML = `
        <div class="social-header">
            <h1 class="newspaper-title">BlackMirror OS</h1>
            <div class="newspaper-subtitle">Social Networks</div>
        </div>
        <div class="social-links">
            <!-- FIXED: Correct social links -->
            <a href="https://x.com/BlackMirrorOS" target="_blank" class="social-link">
                <div class="social-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                </div>
                <span class="social-name">X (Twitter)</span>
            </a>
            <div class="social-link" style="cursor: default; opacity: 0.7;">
                <div class="social-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                </div>
                <span class="social-name">Telegram - Coming soon</span>
            </div>
            <a href="https://medium.com/@blackmirroros" target="_blank" class="social-link">
                <div class="social-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
                    </svg>
                </div>
                <span class="social-name">Medium</span>
            </a>
        </div>
    `;

    menu.appendChild(socialMirror);

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close');
    menu.appendChild(closeButton);

    // Add to document
    document.body.appendChild(menu);

    // Handle close button
    closeButton.addEventListener('click', () => {
        menu.remove();
        resetCameraToBase();
    });
}

// Animation state
let isAnimating = false;
let animationStartTime = 0;
let animationStartPosition = new THREE.Vector3();
let animationTargetPosition = new THREE.Vector3();
let animationTargetLookAt = new THREE.Vector3();
let animationCallback = null;

function startZoomAnimation(targetPoint, callback, objectType = 'default') {
    isAnimating = true;
    animationStartTime = Date.now();
    animationStartPosition.copy(camera.position);
    
    // Disable controls during animation
    controls.enabled = false;
    
    // Store the target point for camera orientation
    animationTargetLookAt = targetPoint.clone();
    
    // Always use the intersection point for reliable zooming
    const direction = new THREE.Vector3().subVectors(targetPoint, camera.position).normalize();
    
    // Adjust zoom distance based on object type
    let zoomDistance = 1.7; // Reduced from 2 to 1.7 for papers
    if (objectType === 'mirror') {
        zoomDistance = 2.6; // Moved back from 2.5 to 2.6 for mirror (1cm back)
    }
    
    animationTargetPosition.copy(camera.position).add(direction.multiplyScalar(zoomDistance));
    
    animationCallback = callback;
}

// Click handler for papers_3 and mirror
function onMouseClick(event) {
    // Initialize audio context on first user interaction
    initializeAudioContext();
    
    // Prevent clicks during animation
    if (isAnimating) {
        return;
    }

    // Convert mouse position to normalized device coordinates (-1 to +1)
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    // Calculate target camera position based on mouse movement (reduced range)
    targetCameraPosition.copy(initialCameraPosition);
    targetCameraPosition.x += mouseX * 0.5; // Reduced from 2 to 0.5
    targetCameraPosition.y += mouseY * 0.3; // Reduced from 1 to 0.3

    // Calculate objects intersecting the picking ray
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
            const intersect = intersects[i];
            const object = intersect.object;
            
            // Check if clicking on papers_3
            if (object.name === 'Object_8' || object.parent?.name === 'papers_3' || object.name === 'papers_3') {
                console.log('📄 Papers clicked!');
                playPaperSound(); // Play paper sound immediately
                startZoomAnimation(intersect.point, showDocumentationMenu, 'papers');
                return;
            }
            
            // Check if clicking on mirror
            if (object.userData && object.userData.isMirror) {
                console.log('🪞 Mirror clicked!');
                playGlassSound(); // Play glass sound immediately
                startZoomAnimation(intersect.point, showSocialMenu, 'mirror');
                return;
            }
            
            // Check if clicking on typewriter
            if (object.userData && object.userData.isTypewriter) {
                console.log('⌨️ Typewriter clicked!');
                playTypewriteSound();
                startZoomAnimation(intersect.point, showTypewriterMenu, 'typewriter');
                return;
            }
        }
    }
}

function updateZoomAnimation() {
    if (!isAnimating) return;
    
    const elapsed = Date.now() - animationStartTime;
    const duration = 3000; // 3 seconds
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing (ease-in-out)
    const smoothProgress = progress * progress * (3 - 2 * progress);
    
    // Interpolate camera position
    camera.position.lerpVectors(animationStartPosition, animationTargetPosition, smoothProgress);
    
    // Look at the target point (mirror)
    camera.lookAt(animationTargetLookAt);
    
    // Animation complete
    if (progress >= 1) {
        isAnimating = false;
        // Re-enable controls
        controls.enabled = true;
        if (animationCallback) {
            animationCallback();
            animationCallback = null;
        }
    }
}

// Smooth camera animation function
function animateCameraTo(targetPosition, targetLookAt) {
    const startPos = camera.position.clone();
    const startLookAt = controls.target.clone();
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate position and look-at
        camera.position.lerpVectors(startPos, targetPosition, easedProgress);
        controls.target.lerpVectors(startLookAt, targetLookAt, easedProgress);
        
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Function to reset camera to base position
function resetCameraToBase() {
    const basePosition = new THREE.Vector3(-1.5, 1.9, 0.8); // Original base position
    const baseTarget = new THREE.Vector3(0.2, 1.3, -0.3); // Original target
    
    // Smooth animation back to base position
    animateCameraTo(basePosition, baseTarget);
}

// Add mouse move listener
window.addEventListener('mousemove', onMouseMove);

// Add click listener
window.addEventListener('click', onMouseClick);

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    composer.setSize(width, height);
    
    // Update pixel ratio in case of window move to different screen
    renderer.setPixelRatio(window.devicePixelRatio);

    // Update controls
    controls.update();
}

function animate() {
    requestAnimationFrame(animate);

    // Update zoom animation if active
    updateZoomAnimation();

    // Update police lights
    updatePoliceLights();

    // Smooth camera movement with increased lerp factor for smoother following
    if (!isAnimating) {
        camera.position.lerp(targetCameraPosition, 0.05); // Increased from 0.02 to 0.05
        camera.lookAt(scene.position);
    }

    // Update the controls only if not animating
    if (!isAnimating) {
        controls.update();
    }

    // Render the scene
    composer.render();
} 

// Police lights setup - Emergency mode
const policeLightBlue = new THREE.SpotLight(0x0044ff, 0.0, 20.0, Math.PI / 6);
policeLightBlue.position.set(4.5, 2.8, -6.0); // Further behind window
policeLightBlue.target.position.set(4.5, 2.8, -3.0); // Point through window
policeLightBlue.penumbra = 0.2; // Sharper edges
policeLightBlue.angle = Math.PI / 6; // Wider beam
policeLightBlue.decay = 1; // Less decay for more intensity
scene.add(policeLightBlue);
scene.add(policeLightBlue.target);

const policeLightRed = new THREE.SpotLight(0xff0000, 0.0, 20.0, Math.PI / 6);
policeLightRed.position.set(5.0, 2.8, -6.0); // Further behind window
policeLightRed.target.position.set(5.0, 2.8, -3.0); // Point through window
policeLightRed.penumbra = 0.2; // Sharper edges
policeLightRed.angle = Math.PI / 6; // Wider beam
policeLightRed.decay = 1; // Less decay for more intensity
scene.add(policeLightRed);
scene.add(policeLightRed.target);

// Add intense window glow effect
const windowGlowBlue = new THREE.PointLight(0x0044ff, 0.0, 4.0);
windowGlowBlue.position.set(4.5, 2.8, -3.0); // At window
windowGlowBlue.decay = 1; // Less decay
scene.add(windowGlowBlue);

const windowGlowRed = new THREE.PointLight(0xff0000, 0.0, 4.0);
windowGlowRed.position.set(5.0, 2.8, -3.0); // At window
windowGlowRed.decay = 1; // Less decay
scene.add(windowGlowRed);

let policeLightTime = 0;
const POLICE_LIGHT_SPEED = 0.025; // Ultra fast flashing for emergency mode
const MAX_INTENSITY = 10.4; // 30% more intensity (8.0 * 1.3)
const WINDOW_GLOW_INTENSITY = 5.2; // 30% more glow intensity

function updatePoliceLights() {
    policeLightTime += POLICE_LIGHT_SPEED;
    
    // Blue light pattern (extremely sharp on/off)
    const bluePhase = Math.sin(policeLightTime * 1.2); // Slightly faster blue flash
    const blueIntensity = bluePhase > 0.3 ? MAX_INTENSITY : 0; // Shorter dark period
    policeLightBlue.intensity = blueIntensity;
    windowGlowBlue.intensity = blueIntensity * 0.7; // Stronger window glow
    
    // Red light pattern (opposite phase, extremely sharp on/off)
    const redPhase = Math.sin(policeLightTime * 1.2 + Math.PI); // Slightly faster red flash
    const redIntensity = redPhase > 0.3 ? MAX_INTENSITY : 0; // Shorter dark period
    policeLightRed.intensity = redIntensity;
    windowGlowRed.intensity = redIntensity * 0.7; // Stronger window glow
}

// Initialize camera positions after scene setup
function initializeCameraPositions() {
    initialCameraPosition.copy(camera.position);
    targetCameraPosition.copy(camera.position);
}

// Add to your scene initialization code (after camera setup)
initializeCameraPositions(); 