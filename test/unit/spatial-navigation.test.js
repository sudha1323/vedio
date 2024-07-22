/* eslint-env qunit */
import SpatialNavigation from '../../src/js/spatial-navigation.js';
import SpatialNavigationKeyCodes from '../../src/js/utils/spatial-navigation-key-codes';
import TestHelpers from './test-helpers.js';
import sinon from 'sinon';
import document from 'global/document';
import TextTrackSelect from '../../src/js/tracks/text-track-select';

QUnit.module('SpatialNavigation', {
  beforeEach() {
    this.clock = sinon.useFakeTimers();
    // Ensure each test starts with a player that has spatial navigation enabled
    this.player = TestHelpers.makePlayer({
      controls: true,
      bigPlayButton: true,
      spatialNavigation: { enabled: true }
    });
    // Directly reference the instantiated SpatialNavigation from the player
    this.spatialNav = this.player.spatialNavigation;
  },
  afterEach() {
    if (this.spatialNav && this.spatialNav.isListening_) {
      this.spatialNav.stop();
    }
    this.player.dispose();
    this.clock.restore();
  }
});

QUnit.test('Initialization sets up initial properties', function(assert) {
  assert.ok(this.spatialNav instanceof SpatialNavigation, 'Instance of SpatialNavigation');
  assert.deepEqual(this.spatialNav.focusableComponents, [], 'Initial focusableComponents is an empty array');
  assert.notOk(this.spatialNav.isListening_, 'isListening_ is initially false');
  assert.notOk(this.spatialNav.isPaused_, 'isPaused_ is initially false');
});

QUnit.test('start method initializes event listeners', function(assert) {
  const onSpy = sinon.spy(this.player, 'on');

  this.spatialNav.start();

  // Check if event listeners are added
  assert.ok(onSpy.calledWith('keydown'), 'keydown event listener added');
  assert.ok(onSpy.calledWith('loadedmetadata'), 'loadedmetadata event listener added');
  assert.ok(onSpy.calledWith('modalKeydown'), 'modalKeydown event listener added');
  assert.ok(onSpy.calledWith('modalclose'), 'modalclose event listener added');
  assert.ok(onSpy.calledWith('error'), 'error event listener added');

  // Additionally, check if isListening_ flag is set
  assert.ok(this.spatialNav.isListening_, 'isListening_ flag is set');

  onSpy.restore();
});

QUnit.test('stop method removes event listeners', function(assert) {
  const offSpy = sinon.spy(this.player, 'off');

  this.spatialNav.start();
  this.spatialNav.stop();
  assert.ok(offSpy.calledWith('keydown'), 'keydown event listener removed');
  assert.notOk(this.spatialNav.isListening_, 'isListening_ flag is unset');
  offSpy.restore();
});

QUnit.test('onKeyDown_ handles navigation keys', function(assert) {
  // Ensure onKeyDown_ is bound correctly.
  assert.equal(typeof this.spatialNav.onKeyDown_, 'function', 'onKeyDown_ should be a function');
  assert.equal(this.spatialNav.onKeyDown_.hasOwnProperty('prototype'), false, 'onKeyDown_ should be bound to the instance');

  // Prepare a spy for the move method to track its calls.
  const moveSpy = sinon.spy(this.spatialNav, 'move');

  // Create and dispatch a mock keydown event.
  const event = new KeyboardEvent('keydown', { // eslint-disable-line no-undef
    key: 'ArrowRight',
    code: 'ArrowRight',
    keyCode: 39
  });

  // Directly invoke the onKeyDown_ handler to simulate receiving the event.
  this.spatialNav.onKeyDown_(event);

  // Assert that move was called correctly.
  assert.ok(moveSpy.calledOnce, 'move method should be called once on keydown event');
  assert.ok(moveSpy.calledWith('right'), 'move method should be called with "right" argument');

  // Restore the spy to clean up.
  moveSpy.restore();
});

QUnit.test('onKeyDown_ handles media keys', function(assert) {
  const performMediaActionSpy = sinon.spy(this.spatialNav, 'performMediaAction_');

  // Create a mock event for the 'play' key, using the hardcoded keyCode 415.
  const event = new KeyboardEvent('keydown', { // eslint-disable-line no-undef
    keyCode: 415
  });

  // Directly call the onKeyDown_ handler.
  this.spatialNav.onKeyDown_(event);

  // Assert that the performMediaAction_ method was called.
  assert.ok(performMediaActionSpy.calledOnce, 'performMediaAction_ method should be called once for media play key');
  assert.ok(performMediaActionSpy.calledWith('play'), 'performMediaAction_ should be called with "play"');

  performMediaActionSpy.restore();
});

QUnit.test('onKeyDown_ handles Back key when target is closeable', function(assert) {
  // Create a spy for the close method.
  const closeSpy = sinon.spy();

  // Create a spy for the preventDefault method.
  const preventDefaultSpy = sinon.spy();

  // Create a mock event target that is closeable.
  const closeableTarget = {
    close: closeSpy,
    closeable: () => true
  };

  // Create a mock event for the 'Back' key, including a properly mocked originalEvent.
  const event = {
    preventDefault: preventDefaultSpy,
    target: closeableTarget,
    originalEvent: {
      keyCode: SpatialNavigationKeyCodes.BACK,
      preventDefault: preventDefaultSpy
    }
  };

  // Stub the SpatialNavigationKeyCodes.isEventKey to return true when the 'Back' key is pressed.
  sinon.stub(SpatialNavigationKeyCodes, 'isEventKey').callsFake((evt, keyName) => keyName === 'Back');

  // Call the onKeyDown_ method with the mock event.
  this.spatialNav.onKeyDown_(event);

  // Asserts
  assert.ok(SpatialNavigationKeyCodes.isEventKey.calledWith(event.originalEvent, 'Back'), 'isEventKey should be called with Back');
  assert.ok(preventDefaultSpy.calledOnce, 'preventDefault should be called once');
  assert.ok(closeSpy.calledOnce, 'close method should be called on the target');

  // Restore stubs
  SpatialNavigationKeyCodes.isEventKey.restore();
});

QUnit.test('performMediaAction_ executes play', function(assert) {
  const playSpy = sinon.spy(this.player, 'play');

  this.spatialNav.performMediaAction_('play');

  assert.ok(playSpy.calledOnce, 'play method should be called once for "play" action');

  playSpy.restore();
});

QUnit.test('performMediaAction_ executes pause', function(assert) {
  const pauseSpy = sinon.spy(this.player, 'pause');

  sinon.stub(this.player, 'paused').returns(false);

  this.spatialNav.performMediaAction_('pause');

  assert.ok(pauseSpy.calledOnce, 'pause method should be called once for "pause" action');

  pauseSpy.restore();
});

QUnit.test('performMediaAction_ executes fast forward', function(assert) {
  const userSeekSpy = sinon.spy(this.spatialNav, 'userSeek_');
  const STEP_SECONDS = 5;
  const initialTime = 30;

  this.player.currentTime = () => initialTime;

  this.spatialNav.performMediaAction_('ff');

  const expectedNewTime = initialTime + STEP_SECONDS;

  assert.ok(userSeekSpy.calledOnce, 'userSeek_ method should be called once for "fast forward" action');
  assert.ok(userSeekSpy.calledWith(expectedNewTime), `userSeek_ method should be called with correct time offset: expected ${expectedNewTime}, got ${userSeekSpy.firstCall.args[0]}`);

  userSeekSpy.restore();
});

QUnit.test('performMediaAction_ executes rewind', function(assert) {
  const userSeekSpy = sinon.spy(this.spatialNav, 'userSeek_');
  const STEP_SECONDS = 5;
  const initialTime = 30;

  this.player.currentTime = () => initialTime;

  this.spatialNav.performMediaAction_('rw');

  const expectedNewTime = initialTime - STEP_SECONDS;

  assert.ok(userSeekSpy.calledOnce, 'userSeek_ method should be called once for "rewind" action');
  assert.ok(userSeekSpy.calledWith(expectedNewTime), `userSeek_ method should be called with correct time offset: expected ${expectedNewTime}, got ${userSeekSpy.firstCall.args[0]}`);

  userSeekSpy.restore();
});

QUnit.test('focus method sets focus on a player component', function(assert) {
  this.spatialNav.start();

  const component = this.player.getChild('bigPlayButton');

  assert.ok(component, 'The target component exists.');

  // Mock getIsAvailableToBeFocused to always return true
  component.getIsAvailableToBeFocused = () => true;

  // Spy on the focus method to check if it's called
  const focusSpy = sinon.spy(component, 'focus');

  this.spatialNav.focus(component);

  assert.ok(focusSpy.calledOnce, 'focus method called on component');

  // Clean up
  focusSpy.restore();
});

QUnit.test('refocusComponent method refocuses the last focused component after losing focus', function(assert) {
  this.spatialNav.start();

  // Get the bigPlayButton component from the player
  const bigPlayButton = this.player.getChild('bigPlayButton');

  // Mock getIsAvailableToBeFocused to always return true for testing
  bigPlayButton.getIsAvailableToBeFocused = () => true;

  // Focus the bigPlayButton and set it as the last focused component
  this.spatialNav.focus(bigPlayButton);

  // Simulate losing focus
  bigPlayButton.el().blur();

  // Call refocusComponent to attempt to refocus the last focused component
  this.spatialNav.refocusComponent();

  // Check if the bigPlayButton is focused again
  assert.strictEqual(this.spatialNav.lastFocusedComponent_, bigPlayButton, 'lastFocusedComponent_ should be set to the blurred component');
});

QUnit.test('move method changes focus to the right component', function(assert) {
  this.spatialNav.start();

  const rightComponent = {
    name: () => 'rightComponent',
    el: () => document.createElement('div'),
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 300, y: 100 }, boundingClientRect: { top: 0, left: 300, bottom: 200, right: 400 } }),
    getIsAvailableToBeFocused: () => true
  };

  const currentComponent = {
    name: () => 'currentComponent',
    el: () => document.createElement('div'),
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 100 }, boundingClientRect: { top: 0, left: 100, bottom: 200, right: 200 } }),
    getIsAvailableToBeFocused: () => true
  };

  this.spatialNav.focusableComponents = [currentComponent, rightComponent];
  this.spatialNav.getCurrentComponent = () => currentComponent;

  this.spatialNav.move('right');

  assert.ok(rightComponent.focus.calledOnce, 'Focus should move to the right component');
  assert.notOk(currentComponent.focus.called, 'Focus should not remain on the current component');
});

QUnit.test('move method changes focus to the left component', function(assert) {
  this.spatialNav.start();

  const leftComponent = {
    name: () => 'leftComponent',
    el: () => document.createElement('div'),
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 0, y: 100 }, boundingClientRect: { top: 0, left: 0, bottom: 200, right: 100 } }),
    getIsAvailableToBeFocused: () => true
  };

  const currentComponent = {
    name: () => 'currentComponent',
    el: () => document.createElement('div'),
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 200, y: 100 }, boundingClientRect: { top: 0, left: 200, bottom: 200, right: 300 } }),
    getIsAvailableToBeFocused: () => true
  };

  this.spatialNav.focusableComponents = [leftComponent, currentComponent];
  this.spatialNav.getCurrentComponent = () => currentComponent;

  this.spatialNav.move('left');

  assert.ok(leftComponent.focus.calledOnce, 'Focus should move to the left component');
  assert.notOk(currentComponent.focus.called, 'Focus should not remain on the current component');
});

QUnit.test('move method changes focus to the above component', function(assert) {
  this.spatialNav.start();

  const aboveComponent = {
    name: () => 'aboveComponent',
    el: () => document.createElement('div'),
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 0 }, boundingClientRect: { top: 0, left: 0, bottom: 100, right: 200 } }),
    getIsAvailableToBeFocused: () => true
  };

  const currentComponent = {
    name: () => 'currentComponent',
    el: () => document.createElement('div'),
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 200 }, boundingClientRect: { top: 200, left: 0, bottom: 300, right: 200 } }),
    getIsAvailableToBeFocused: () => true
  };

  this.spatialNav.focusableComponents = [aboveComponent, currentComponent];
  this.spatialNav.getCurrentComponent = () => currentComponent;

  this.spatialNav.move('up');

  assert.ok(aboveComponent.focus.calledOnce, 'Focus should move to the above component');
  assert.notOk(currentComponent.focus.called, 'Focus should not remain on the current component');
});

QUnit.test('move method changes focus to the below component', function(assert) {
  this.spatialNav.start();

  const belowComponent = {
    name: () => 'belowComponent',
    el: () => document.createElement('div'),
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 300 }, boundingClientRect: { top: 300, left: 0, bottom: 400, right: 200 } }),
    getIsAvailableToBeFocused: () => true
  };

  const currentComponent = {
    name: () => 'currentComponent',
    el: () => document.createElement('div'),
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 100 }, boundingClientRect: { top: 0, left: 0, bottom: 200, right: 200 } }),
    getIsAvailableToBeFocused: () => true
  };

  this.spatialNav.focusableComponents = [belowComponent, currentComponent];
  this.spatialNav.getCurrentComponent = () => currentComponent;

  this.spatialNav.move('down');

  assert.ok(belowComponent.focus.calledOnce, 'Focus should move to the below component');
  assert.notOk(currentComponent.focus.called, 'Focus should not remain on the current component');
});

QUnit.test('getCurrentComponent method returns the current focused component', function(assert) {
  this.spatialNav.start();

  // Get the bigPlayButton component from the player
  const bigPlayButton = this.player.getChild('bigPlayButton');

  // Mock getIsAvailableToBeFocused to always return true for testing
  bigPlayButton.getIsAvailableToBeFocused = () => true;

  // Focus the bigPlayButton
  this.spatialNav.focus(bigPlayButton);

  // Call getCurrentComponent to get the current focused component
  const currentComponent = this.spatialNav.getCurrentComponent();

  // Check if the currentComponent is the bigPlayButton
  assert.strictEqual(currentComponent, bigPlayButton, 'getCurrentComponent should return the focused component');
});

QUnit.test('add method adds a new focusable component', function(assert) {
  this.spatialNav.start();

  // Create a mock component with an 'el_' property and 'el' method
  const newComponent = {
    name: () => 'newComponent',
    el_: document.createElement('div'),
    el() {
      return this.el_;
    },
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 100 }, boundingClientRect: { top: 100, left: 100, bottom: 200, right: 200 } }),
    getIsAvailableToBeFocused: () => true,
    getIsFocusable: () => true
  };

  // Add the new component
  this.spatialNav.add(newComponent);

  // Check if the new component is added to the list of focusable components
  assert.strictEqual(this.spatialNav.focusableComponents.includes(newComponent), true, 'New component should be added');
});

QUnit.test('remove method removes a focusable component', function(assert) {
  this.spatialNav.start();

  // Create a mock component
  const componentToRemove = {
    name: () => 'componentToRemove',
    el_: document.createElement('div'),
    el() {
      return this.el_;
    },
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 100 }, boundingClientRect: { top: 100, left: 100, bottom: 200, right: 200 } }),
    getIsAvailableToBeFocused: () => true,
    getIsFocusable: () => true
  };

  // Add the component to be removed
  this.spatialNav.add(componentToRemove);

  // Remove the component
  this.spatialNav.remove(componentToRemove);

  // Check if the component is removed from the list of focusable components
  assert.strictEqual(this.spatialNav.focusableComponents.includes(componentToRemove), false, 'Component should be removed');
});

QUnit.test('clear method removes all focusable components', function(assert) {
  this.spatialNav.start();

  // Create mock components
  const component1 = {
    name: () => 'component1',
    el_: document.createElement('div'),
    el() {
      return this.el_;
    },
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 100 }, boundingClientRect: { top: 100, left: 100, bottom: 200, right: 200 } }),
    getIsAvailableToBeFocused: () => true,
    getIsFocusable: () => true
  };

  const component2 = {
    name: () => 'component2',
    el_: document.createElement('div'),
    el() {
      return this.el_;
    },
    focus: sinon.spy(),
    getPositions: () => ({ center: { x: 100, y: 100 }, boundingClientRect: { top: 100, left: 100, bottom: 200, right: 200 } }),
    getIsAvailableToBeFocused: () => true,
    getIsFocusable: () => true
  };

  // Add the components
  this.spatialNav.add(component1);
  this.spatialNav.add(component2);

  // Clear all components
  this.spatialNav.clear();

  // Check if the focusableComponents array is empty after clearing
  assert.strictEqual(this.spatialNav.focusableComponents.length, 0, 'All components should be cleared');
});

QUnit.test('should call `searchForTrackSelect()` if spatial navigation is enabled on click event', function(assert) {
  const element = document.createElement('div');

  element.classList.add('vjs-text-track-settings');

  const clickEvent = new MouseEvent('click', { // eslint-disable-line no-undef
    view: this.window,
    bubbles: true,
    cancelable: true,
    currentTarget: element
  });

  Object.defineProperty(clickEvent, 'relatedTarget', {writable: false, value: element});
  Object.defineProperty(clickEvent, 'currentTarget', {writable: false, value: element});

  const trackSelectSpy = sinon.spy(this.spatialNav, 'searchForTrackSelect_');

  const textTrackSelectComponent = new TextTrackSelect(this.player, {
    SelectOptions: ['Option 1', 'Option 2', 'Option 3'],
    legendId: '1',
    id: 1,
    labelId: '1'
  });

  this.spatialNav.updateFocusableComponents = () => [textTrackSelectComponent];

  this.spatialNav.handlePlayerBlur_(clickEvent);

  assert.ok(trackSelectSpy.calledOnce);
});

QUnit.test('error on player calls updateFocusableComponents', function(assert) {
  const updateFocusableComponentsSpy = sinon.spy(this.spatialNav, 'updateFocusableComponents');

  this.spatialNav.start();

  this.player.error('Error 1');

  assert.ok(updateFocusableComponentsSpy.calledOnce, 'on error event spatial navigation should call "updateFocusableComponents"');
});
