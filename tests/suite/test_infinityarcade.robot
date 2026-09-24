*** Settings ***
Documentation    Test cases for infinity-arcade snap
Resource         kvm.resource


*** Test Cases ***
Infinity Arcade Launches And Renders
    [Documentation]    Verify infinity-arcade snap launches and renders a UI on Mir
    [Tags]    smoke    yarf:certification_status: blocker
    Log Screenshot
