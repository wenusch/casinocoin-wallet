import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { Validators,FormControl,FormGroup,FormBuilder } from '@angular/forms';

 @Injectable()
 export class ValidatorService {
 
    private checkIfIsInteger(value){
        if((parseFloat(value) == parseInt(value)) && !isNaN(value)){ 
           // I can have spacespacespace1 - which is 1 and validators pases but
           // spacespacespace doesn't - which is what i wanted.
           // 1space2 doesn't pass - good
           // of course, when saving data you do another parseInt.
            return true;
        } else {
            return false;
        }
    }

    private checkIfBelowMaxTagValue(value){
        if(value < 2147483647){
            return true;
        } else {
            return false;
        }
    }
     
    public isInteger = (control:FormControl) => {
         return this.checkIfIsInteger(control.value) ? null : {
            notNumeric: true
         }
    }

    public isValidDestinationTag = (control:FormControl) => {
        return this.checkIfIsInteger(control.value) && this.checkIfBelowMaxTagValue(control.value) ? null : {
            notNumeric: true
         }
    }
 
 }