/* ═══════════════════════════════════════════════════════════════════════════
   Tenant Manager — Multi-Tenant Practice Context
   ═══════════════════════════════════════════════════════════════════════════
   Central module that resolves the current user to their practice,
   provides tenant-scoped Firestore path helpers, and manages
   practice configuration caching.
   
   Exports: window.TenantManager
   ═══════════════════════════════════════════════════════════════════════════ */

;(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────
  var _practiceId = null;
  var _practiceData = null;
  var _userRole = null;
  var _initialized = false;
  var _initPromise = null;

  // ─── Constants ────────────────────────────────────────────────────────
  var STORAGE_KEY = 'paloma_practice_id';
  var DEFAULT_PRACTICE = 'brenes';  // Christian's practice (legacy)

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Initialize tenant context. Called after Firebase Auth confirms user.
   * Resolves which practice the current user belongs to.
   * 
   * Strategy:
   * 1. Check if user email exists in any practice's team collection
   * 2. Fallback to legacy root-level practice-config (for migration)
   * 3. If no practice found, create one (first-time setup)
   */
  function init() {
    if (_initPromise) return _initPromise;
    
    _initPromise = new Promise(function(resolve, reject) {
      var user = firebase.auth().currentUser;
      if (!user) { reject(new Error('No authenticated user')); return; }
      
      var db = firebase.firestore();
      var email = user.email;
      
      // Step 1: Check practices/{id}/team/{email} for membership
      db.collectionGroup('team').where('email', '==', email).limit(1).get()
        .then(function(snap) {
          if (!snap.empty) {
            // Found! Extract practice ID from path: practices/{id}/team/{docId}
            var teamDoc = snap.docs[0];
            _practiceId = teamDoc.ref.parent.parent.id;
            _userRole = teamDoc.data().role || 'staff';
            console.log('[Tenant] Resolved practice:', _practiceId, 'role:', _userRole);
            return loadPracticeData();
          }
          
          // Step 2: Check legacy setup — look for practice-config/settings
          return db.collection('practice-config').doc('settings').get()
            .then(function(legacyDoc) {
              if (legacyDoc.exists) {
                // Legacy single-tenant mode — use default practice ID
                _practiceId = DEFAULT_PRACTICE;
                _userRole = 'admin';  // Legacy users are all admins
                console.log('[Tenant] Legacy mode, using default practice:', _practiceId);
                return ensurePracticeExists(user, legacyDoc.data());
              }
              
              // Step 3: No practice at all — create one
              _practiceId = DEFAULT_PRACTICE;
              _userRole = 'admin';
              console.log('[Tenant] No practice found, creating default');
              return ensurePracticeExists(user, {});
            });
        })
        .then(function() {
          _initialized = true;
          localStorage.setItem(STORAGE_KEY, _practiceId);
          resolve({ practiceId: _practiceId, role: _userRole });
        })
        .catch(function(err) {
          console.error('[Tenant] Init failed:', err);
          // Fallback to default
          _practiceId = DEFAULT_PRACTICE;
          _userRole = 'admin';
          _initialized = true;
          resolve({ practiceId: _practiceId, role: _userRole });
        });
    });
    
    return _initPromise;
  }

  /**
   * Ensure the practice document exists in multi-tenant structure.
   * Creates practices/{id} and practices/{id}/team/{userId} if missing.
   */
  function ensurePracticeExists(user, legacyConfig) {
    var db = firebase.firestore();
    var practiceRef = db.collection('practices').doc(_practiceId);
    
    return practiceRef.get().then(function(doc) {
      if (doc.exists) {
        _practiceData = doc.data();
        return;
      }
      
      // Create practice document
      var practiceDoc = {
        name: legacyConfig.practice_name || 'Brenes Precision Dentistry',
        slug: _practiceId,
        owner_email: user.email,
        plan: 'professional',
        status: 'active',
        specialty: legacyConfig.specialty || 'general',
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        branding: {
          primary_color: '#2dd4bf',
          practice_phone: legacyConfig.phone || '(336) 545-4281'
        }
      };
      
      _practiceData = practiceDoc;
      
      // Create practice + team member in a batch
      var batch = db.batch();
      batch.set(practiceRef, practiceDoc);
      batch.set(practiceRef.collection('team').doc(user.uid), {
        email: user.email,
        role: 'admin',
        name: user.displayName || user.email.split('@')[0],
        joined_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return batch.commit().then(function() {
        console.log('[Tenant] Created practice:', _practiceId);
      });
    });
  }

  /**
   * Load practice data from Firestore.
   */
  function loadPracticeData() {
    var db = firebase.firestore();
    return db.collection('practices').doc(_practiceId).get()
      .then(function(doc) {
        if (doc.exists) {
          _practiceData = doc.data();
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PATH HELPERS — Use these for ALL Firestore queries
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get the Firestore collection path scoped to current practice.
   * Example: collection('patients') → 'practices/brenes/patients'
   */
  function collection(name) {
    if (!_practiceId) {
      console.warn('[Tenant] Practice not initialized, using legacy path');
      return name;
    }
    return 'practices/' + _practiceId + '/' + name;
  }

  /**
   * Get a Firestore CollectionReference scoped to current practice.
   */
  function getCollection(name) {
    var db = firebase.firestore();
    if (!_practiceId) return db.collection(name);
    return db.collection('practices').doc(_practiceId).collection(name);
  }

  /**
   * Get the Storage path scoped to current practice.
   * Example: storagePath('patients/123/xrays') → 'practices/brenes/patients/123/xrays'
   */
  function storagePath(path) {
    if (!_practiceId) return path;
    return 'practices/' + _practiceId + '/' + path;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════

  function getPracticeId() { return _practiceId; }
  function getPracticeData() { return _practiceData; }
  function getUserRole() { return _userRole; }
  function isInitialized() { return _initialized; }
  function isAdmin() { return _userRole === 'admin' || _userRole === 'owner'; }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  window.TenantManager = {
    init: init,
    collection: collection,
    getCollection: getCollection,
    storagePath: storagePath,
    getPracticeId: getPracticeId,
    getPracticeData: getPracticeData,
    getUserRole: getUserRole,
    isInitialized: isInitialized,
    isAdmin: isAdmin
  };

})();
