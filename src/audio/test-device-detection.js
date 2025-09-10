/**
 * Test Device Detection for iPad Pro Audio Fix
 * This script can be run in browser console to verify device detection
 */

import { DeviceAudioConfigManager } from './DeviceAudioConfig';

// Test function to verify device detection
function testDeviceDetection() {
  console.log('🔍 TESTING DEVICE DETECTION FOR IPAD PRO AUDIO FIX');
  console.log('='.repeat(60));
  
  const config = DeviceAudioConfigManager.getOptimalAudioConfig();
  
  console.log('📱 DEVICE DETECTION RESULTS:');
  console.log(`   Device Type: ${config.deviceType}`);
  console.log(`   Device Info: ${config.deviceInfo}`);
  console.log(`   Recommended Sample Rate: ${config.recommendedSampleRate}Hz`);
  console.log(`   Schedule Ahead Time: ${config.scheduleAheadTime * 1000}ms`);
  console.log(`   Reason: ${config.reason}`);
  
  if (config.fallbackSampleRate) {
    console.log(`   Fallback Sample Rate: ${config.fallbackSampleRate}Hz`);
  }
  
  console.log('');
  console.log('🎯 EXPECTED BEHAVIOR:');
  console.log('   - Desktop: 48kHz (working)');
  console.log('   - iPhone: 48kHz (working)');
  console.log('   - iPad Pro: 44.1kHz (FIX for "komplett zerbrochene" audio)');
  console.log('   - iPad (other): 44.1kHz (safety)');
  console.log('   - Android: 44.1kHz (conservative)');
  
  console.log('');
  console.log('🚨 CRITICAL CHECK:');
  const isProblematicDevice = DeviceAudioConfigManager.isProblematicDevice();
  console.log(`   Is Problematic Device (needs fix): ${isProblematicDevice}`);
  
  console.log('');
  console.log('🔧 CURRENT USER AGENT:');
  console.log(`   ${navigator.userAgent}`);
  
  return config;
}

// Test different scenarios
function simulateDeviceTests() {
  console.log('');
  console.log('🧪 SIMULATING DIFFERENT DEVICES:');
  console.log('='.repeat(60));
  
  const testCases = [
    {
      name: 'Desktop Chrome',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    {
      name: 'iPhone Safari', 
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    },
    {
      name: 'iPad Pro (PROBLEM DEVICE)',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    },
    {
      name: 'Android Chrome',
      userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    }
  ];
  
  // Note: We can't actually change navigator.userAgent, but we can document expected behavior
  testCases.forEach(testCase => {
    console.log(`📱 ${testCase.name}:`);
    console.log(`   UserAgent: ${testCase.userAgent.substring(0, 80)}...`);
    
    if (testCase.name.includes('Desktop')) {
      console.log(`   ✅ Expected: 48kHz (working fine)`);
    } else if (testCase.name.includes('iPhone')) {
      console.log(`   ✅ Expected: 48kHz (working fine)`);
    } else if (testCase.name.includes('iPad Pro')) {
      console.log(`   🚨 Expected: 44.1kHz (FIX for audio corruption)`);
    } else if (testCase.name.includes('Android')) {
      console.log(`   ⚠️  Expected: 44.1kHz (conservative choice)`);
    }
    console.log('');
  });
}

// Export functions for console use
window.testDeviceDetection = testDeviceDetection;
window.simulateDeviceTests = simulateDeviceTests;

// Run test immediately
testDeviceDetection();
simulateDeviceTests();

console.log('🎵 Device detection test complete!');
console.log('💡 Run testDeviceDetection() in console to test again');