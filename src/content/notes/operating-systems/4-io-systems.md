---
category: "notes/operating-systems"
title: "I/O Systems"
date: "2024-9-10"
description: ""
tags: []
---
![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/994717fe-209a-4128-9856-2572f62afd05/9a1479d8-2241-443f-82be-0a2f0be83f0f/image.png)

## Example of small device:

![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/994717fe-209a-4128-9856-2572f62afd05/d519096a-b82b-4c95-9011-e29fadffbab9/image.png)

Status register will tell you current status of device. Command will tell the device to perform some kind of task. Data is to pass data to the device.

![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/994717fe-209a-4128-9856-2572f62afd05/a0a45a1c-fb75-4c6a-9d82-402584755bce/image.png)

The while loop you see is called **polling** a device. 

## Interrupting instead of polling

After an I/O operation is finished, it will raise an interrupt so the calling process can go back to the READY state. So the CPU doesn’t have to poll the I/O device all the time. This allows overlap of computation and I/O.

Sometimes polling might work better than interrupting. For example if a device finishes it tasks really quickly, switching to another process, handling the interrupt, switching back to the issuing process will slow down the system.

Two-phase approach (polling for a little and if the device isnt finished using interrupts) works well too.

## Direct Memory Access (DMA)

The CPU would waste a lot of time transferring data to and from the device’s data register. Instead, there’s an engine that does this kind of work called the DMA: (diagram with process 1 and process 2 computation)

![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/994717fe-209a-4128-9856-2572f62afd05/dd76e813-7499-4651-a72d-453bedba4987/image.png)

The OS programs the DMA engine telling it where the data lives in memory, how much data to copy, and which device to send it to. At that point, the OS is done with the transfer and can proceed with other work. 

When the DMA is complete, the DMA controller raises an interrupt, and the OS thus knows the transfer is complete.

## Device Driver

How does the OS know how a device works? With a piece of software called device driver, where the specifics of device interaction are encapsulated.

All of this is abstracted away then. Here’s an example for a file system and some storage devices.

![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/994717fe-209a-4128-9856-2572f62afd05/6c9f5d2a-1ccf-4bfa-b48f-6efb2c34d0d4/image.png)

This much abstraction actually has some downsides. For example the SCSI has better capabilities for error handling, but ASA/IDE don’t. Thereforet he interface loses that extra capability because it needs to be generic for all devices.