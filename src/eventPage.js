import * as watlib from 'wat_action_nightmare';

class PageManager {
	constructor() {
		this.scenario = new watlib.Scenario();
		this.isRecording = false;
		this.isLoggedIn = false;

		this.handleMessage = this.handleMessage.bind(this);
		this.startRecording = this.startRecording.bind(this);
		this.startRecording = this.startRecording.bind(this);
		this.getRecordedScenarioAndStop = this.getRecordedScenarioAndStop.bind(this);
		this.reinitRecording = this.reinitRecording.bind(this);
		this.webNavigationCommitted = this.webNavigationCommitted.bind(this);
		this.webNavigationCompleted = this.webNavigationCompleted.bind(this);
	}

	start() {
		chrome.runtime.onMessage.addListener(this.handleMessage);
	}

	handleMessage(msg, sender, sendResponse) {
		switch (msg.kind) {
		case 'start': 
			this.startRecording();
			break;
		case 'publish': 
			sendResponse(this.getRecordedScenarioAndStop());
			break;
		case 'reinit': 
			this.reinitRecording();
			break;
		case 'nowIsLogin': 
			this.isLoggedIn = true;
			break;
		case 'nowIsLogout': 
			this.isLoggedIn = false;
			break;
		case 'getState': 
			sendResponse({
				isLoggedIn: this.isLoggedIn,
				isRecording: this.isRecording
			});
			break;
		case 'action' : 
			console.log(`action added : ${msg.action.type}`);
			this.scenario.addAction(watlib.ActionFactory.createAction(msg.action));
			break;
		}
	}

	startRecording() {
		console.log('startRecording');
		this.scenario = new watlib.Scenario();
		this.isRecording = true;
		chrome.webNavigation.onCommitted.addListener(this.webNavigationCommitted);
		chrome.webNavigation.onCompleted.addListener(this.webNavigationCompleted);
	
		chrome.tabs.query({active: true, currentWindow: true}, activeTabs => {
			if (activeTabs.length && activeTabs.length > 0) {
				console.log('reload');
				chrome.tabs.reload(activeTabs[0].id);
			}
		});
	}

	getRecordedScenarioAndStop() {
		this.isRecording = false;
		chrome.webNavigation.onCommitted.removeListener(this.webNavigationCommitted);
		chrome.webNavigation.onCompleted.removeListener(this.webNavigationCompleted);
		return   {
			actions : this.scenario.actions
		};
	}

	reinitRecording() {
		this.isRecording = false;
		chrome.webNavigation.onCommitted.removeListener(this.webNavigationCommitted);
		chrome.webNavigation.onCompleted.removeListener(this.webNavigationCompleted);
		this.scenario = new watlib.Scenario();
	}

	webNavigationCommitted({transitionType, url}) {
		chrome.tabs.query({active: true, currentWindow: true}, activeTabs => {
			if (transitionType === 'reload' || transitionType === 'start_page') {
				if (activeTabs.length && activeTabs.length > 0) {
					pageManager.scenario.addAction(watlib.ActionFactory.createAction({type:'GotoAction', url:url}));
					console.log('goto added');
				}
			}
		});  
	}

	webNavigationCompleted({frameId}) {
		chrome.tabs.query({active: true}, activeTabs => {
			if (frameId === 0) {
				if (activeTabs.length && activeTabs.length > 0) {
					chrome.tabs.executeScript(activeTabs[0].id , {file:'attachListener.js'});
				}
			}
		});
	}
}

var pageManager = new PageManager();
pageManager.start();
