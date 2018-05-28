(function() {
  'use strict';

  var streamCommand = "raspivid -o - -t 0 -hf -w 1920 -h 1080 -fps 25 -n | cvlc -vvv stream:///dev/stdin --sout '#standard{access=http,mux=ts,dst=:8080' :demux=h264";

  angular
    .module('sc2')
    .directive('controlPanel', ControlPanel);

  /** @ngInject */
  function ControlPanel($log, $rootScope, exSocket, connector) {
    var directive = {
      restrict: 'EA',
      templateUrl: 'app/components/controlPanel/controlPanel.html',
      scope: {
        /*item: '='*/
      },
      controller: ControlPanelController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;


    /** @ngInject */
    function ControlPanelController(moment, optionsConfig, exSocket, connector) {
      var vm = this;
      vm.data = optionsConfig.getOptions();

      vm.target = "";

      vm.updateFileUrl = '';
      vm.updateFileDest = '/home/pi/server.js';
      vm.scannerService  = connector.getScanners()
      //vm.shellFeedback = scannerService.shellFeedback;
      //vm.allScanners = scannerService.allScanners;

      vm.newPreset = '';

      vm.deletePreset = function(oldName) {
        if (!oldName) return;

        var answer = confirm('Do you want to remove preset: ' + oldName + '?')
        if(!answer){
          return;
        }

        var item = vm.data.presets.find(function (item) {
          return item.name === oldName;
        });

        var pos = vm.data.presets.indexOf(item);
        vm.data.presets.splice(pos, 1);

        if(vm.data.presets.length){
          vm.data.selectedPreset = vm.data.presets[0].name;
        } else {
          vm.data.selectedPreset = '';
        }

        exSocket.emit("save preset", {
          lightSettings: vm.data.lightSettings,
          photoSettings: vm.data.photoSettings,
          presets: vm.data.presets,
          selectedPreset: vm.data.selectedPreset
        });

        vm.changePreset();
      };

      vm.renamePreset = function(name){
        var oldName = name.trim();
        if(!oldName.trim()) return;

        var result = prompt("Please rename preset", oldName);
        var newName = result ? result.trim() : "";

        if(newName){
          var item = vm.data.presets.find(function(item){
            return item.name === oldName;
          });

          var duplicate = vm.data.presets.find(function(item){
            return item.name == newName;
          });

          if(duplicate){
            alert('Enter new name');
            return;
          }


          if(item){
            item.name = newName;
            vm.data.selectedPreset = newName;

            exSocket.emit("save preset", {
              lightSettings: vm.data.lightSettings,
              photoSettings: vm.data.photoSettings,
              presets: vm.data.presets,
              selectedPreset: vm.data.selectedPreset
            });
          }
        }
      }

      vm.changePreset = function(){
        var preset = vm.data.presets.find(function(item){
          return item.name === vm.data.selectedPreset.trim();
        });

        if(preset){
          vm.data.photoSettings = preset.photoSettings;
          vm.data.lightSettings = preset.lightSettings;

          for(var i = 0; i < vm.data.options.length; i++){
            var cmd = vm.data.options[i].command;
            vm.data.options[i].value = vm.data.photoSettings[cmd];
          }
        }
      }

      vm.saveNewPreset = function(){

        vm.newPreset = vm.newPreset.trim();

        if(vm.newPreset == ''){
          alert('Enter preset name');
          return;
        }

        var duplicate = vm.data.presets.find(function(item){
          return item.name == vm.newPreset;
        });

        if(duplicate){
          alert('Enter new name');
          return;
        }

        vm.data.presets.push({
          id: (new Date()).getTime(),
          name: vm.newPreset,
          lightSettings: vm.data.lightSettings,
          photoSettings: vm.data.photoSettings,
        });

        vm.data.selectedPreset = vm.newPreset;

        exSocket.emit("save preset", {
          lightSettings: vm.data.lightSettings,
          photoSettings: vm.data.photoSettings,
          presets: vm.data.presets,
          selectedPreset: vm.data.selectedPreset
        });

        vm.newPreset = '';
      }

      vm.change = function(){

        vm.data.selectedPreset = '';

        var resultCommand = {};

        for(var i = 0; i < vm.data.options.length; i++){
          var opt = vm.data.options[i];

          if(!opt.value || opt.value == ""){
            continue;
          }
          switch(opt.type){
            case "int":
            case "string":
            case "list":
              {
                resultCommand[opt.command] = opt.value;
                break;
              };
          }
        }

        //resultCommand['thumb'] = 'none'
        resultCommand['nopreview'] = true;

        vm.data.photoSettings = resultCommand;
      }

      vm.setupConfig = function(){
        exSocket.emit("setup settings", {
          selectedPreset: vm.data.selectedPreset,
          photo: vm.data.photoSettings,
          light: vm.data.lightSettings
        });
      }

      vm.updateFile = function() {
         exSocket.emit("update-file", {
           url: vm.updateFileUrl,
           dest: vm.updateFileDest
         });
      }

      vm.execShell = function(){
        console.log("shell: " + vm.shellCommand);

        //vm.target
        exSocket.emit("shell", {
          shellCommand: vm.shellCommand,
          target: vm.target || null
        });
      }

      vm.execStream = function(){
        if(vm.target) {
          exSocket.emit("shell", {
            shellCommand: streamCommand,
            target: vm.target
          });
        }
      }

      vm.softExecute = function(){
          exSocket.emit("soft trigger");
      }

      vm.execute = function(){
          exSocket.emit("start command");
      }

      vm.change();
    }
  }

})();
